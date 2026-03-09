import { fetchBodaccSales, fetchBodaccLiquidations, fetchBodaccLocationGerances } from '../utils/bodaccParser.js';
import { EntrepriseEnricher } from './EntrepriseEnricher.js';

/**
 * Geocode a single address via the Vite dev proxy → api-adresse.data.gouv.fr
 * No CORS issues since the request goes through localhost.
 */
async function geocodeSingle(address) {
    try {
        const url = `/api/geocode/search/?q=${encodeURIComponent(address)}&citycode=75056&limit=1`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return null;
        const data = await res.json();
        if (data.features && data.features.length > 0) {
            const f = data.features[0];
            const postcode = f.properties.postcode || '';
            const score = f.properties.score || 0;
            if (score > 0.2 && postcode.startsWith('75')) {
                return {
                    lat: f.geometry.coordinates[1],
                    lng: f.geometry.coordinates[0],
                    postcode,
                };
            }
        }
    } catch (e) {
        // timeout or network error — skip
    }
    return null;
}

/**
 * Concurrency pool — run async tasks with a max parallelism limit.
 */
async function asyncPool(concurrency, items, fn) {
    const results = [];
    const executing = new Set();
    for (const item of items) {
        const p = Promise.resolve().then(() => fn(item));
        results.push(p);
        executing.add(p);
        const clean = () => executing.delete(p);
        p.then(clean, clean);
        if (executing.size >= concurrency) {
            await Promise.race(executing);
        }
    }
    return Promise.all(results);
}

export class MovementEngine {
    constructor() {
        this.cache = new Map();
    }

    async fetchParisMovements() {
        console.log("🚀 Récupération des mouvements sur Paris (12 mois)...");
        const t0 = Date.now();

        // 1. Fetch BODACC — 3 sources en parallèle (50 par source max)
        const [sales, liquidations, gerances] = await Promise.all([
            fetchBodaccSales({ zipCode: '', city: 'Paris', limit: 50 }),
            fetchBodaccLiquidations({ zipCode: '', city: 'Paris', limit: 50 }),
            fetchBodaccLocationGerances({ zipCode: '', city: 'Paris', limit: 50 })
        ]);
        console.log(`  📥 BODACC fetch: ${Date.now() - t0}ms`);

        let allMovements = [
            ...(sales || []).map(s => ({ ...s, markerType: 'VENTE' })),
            ...(liquidations || []).map(l => ({ ...l, markerType: 'LIQUIDATION' })),
            ...(gerances || []).map(g => ({ ...g, markerType: 'GERANCE' }))
        ];

        // 2. Filtre temporel (< 365 jours)
        const oneYearAgo = new Date();
        oneYearAgo.setDate(oneYearAgo.getDate() - 365);
        allMovements = allMovements.filter(m => new Date(m.date) >= oneYearAgo);

        // 3. Déduplique par adresse
        const seen = new Set();
        allMovements = allMovements.filter(m => {
            const key = `${m.adresse}-${m.enseigne}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        console.log(`  📊 ${allMovements.length} mouvements à géocoder`);

        // 4. Geocode via Vite proxy (no CORS), pool of 20
        const t1 = Date.now();
        const movementsWithCoords = [];

        await asyncPool(20, allMovements, async (movement) => {
            if (!movement.adresse || movement.adresse === "Adresse non spécifiée") return;

            // Use cache to avoid duplicate API calls for same address
            if (!this.cache.has(movement.adresse)) {
                const coords = await geocodeSingle(`${movement.adresse}, Paris`);
                this.cache.set(movement.adresse, coords || null);
            }

            const coords = this.cache.get(movement.adresse);
            if (coords) {
                movement.lat = coords.lat;
                movement.lng = coords.lng;
                this.applyIntelligence(movement);

                movement.googleMapsUrl = EntrepriseEnricher.generateGoogleMapsLink(
                    movement.enseigne, `${movement.adresse}, Paris`
                );

                // Lazy-enriched on popup click
                movement.dirigeant = null;
                movement.terraceInfo = null;
                movement.extractionInfo = null;
                movement.nuisanceInfo = null;

                movementsWithCoords.push(movement);
            }
        });

        console.log(`  🗺 Géocodage: ${Date.now() - t1}ms — ${movementsWithCoords.length} points géolocalisés`);
        console.log(`  ✅ Total: ${Date.now() - t0}ms`);

        return movementsWithCoords;
    }

    applyIntelligence(movement) {
        if (movement.effectif && !movement.effectif.includes("Non") && !movement.effectif.includes("0 ")) {
            const match = movement.effectif.match(/\d+/g);
            if (match) {
                let n = parseInt(match[match.length - 1], 10);
                if (match.length > 1) n = Math.round((parseInt(match[0], 10) + parseInt(match[1], 10)) / 2);
                movement.caProxy = n * 85000;
            }
        }
        if (movement.prix) {
            const p = parseFloat(movement.prix.replace(/,/g, '.').replace(/\s/g, ''));
            if (p > 0 && p < 50000) movement.isOpportunityAnomaly = true;
        }
    }
}

export const movementEngine = new MovementEngine();
