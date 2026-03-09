// Services to enrich geocoded coordinates with Open Data Paris and Etalab info

export class OpenDataEnricher {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Hack Terrasse: Vérifier s'il y a une autorisation et la largeur du trottoir.
     * Approximation via API Open Data Paris (étalages et terrasses + voirie).
     */
    async checkTerracePotential(lat, lng) {
        // En vrai: Appels API géospatiaux (ex: opendata.paris.fr/api/records/1.0/search/?dataset=etalages-et-terrasses&geofilter.distance=lat,lng,20)
        // Mock implémentation basée sur le prompt "si trottoir > 2.80m sans autorisation"

        // Simulation d'un appel réseau:
        await new Promise(resolve => setTimeout(resolve, 100));

        // On simule une chance aléatoire (basée sur hash des coords) pour l'MVP
        const hash = Math.abs(Math.sin(lat * lng) * 10000);
        const hasAuthorization = hash % 10 > 7; // 30% ont une autorisation
        const trottoirWidth = (hash % 4) + 1.5; // Entre 1.5m et 5.5m

        const potential = !hasAuthorization && trottoirWidth > 2.80;

        return {
            hasAuthorization,
            trottoirWidth: trottoirWidth.toFixed(2),
            potential,
            message: potential
                ? `Potentiel Élevé ! Trottoir de ${trottoirWidth.toFixed(2)}m, aucune autorisation active détectée.`
                : hasAuthorization
                    ? `Terrasse déjà autorisée.`
                    : `Potentiel Faible. Trottoir de ${trottoirWidth.toFixed(2)}m (min requis: 2.80m).`
        };
    }

    /**
     * Diagnostic Extraction: Historique NAF (10.11Z, 10.71A, 56.10A)
     * Simulation de l'historique d'un local vis-à-vis des codes NAF autorisant l'extraction naturelle.
     */
    async checkExtractionDiagnostic(nafCode, activite) {
        const extractionFriendlyNaf = ['10.11Z', '10.71A', '56.10A', '56.10B', '56.10C'];
        const isExtractionFriendly = extractionFriendlyNaf.includes(nafCode) ||
            (activite && activite.toLowerCase().includes('restaura'));

        return {
            isExtractionFriendly,
            message: isExtractionFriendly
                ? "Historique compatible 'Restauration/Alimentaire'. Extraction existante hautement probable."
                : "Alerte : Local potentiellement sans extraction (à vérifier sur place)."
        };
    }

    /**
     * Alerte Nuisance: Chantiers à moins de 50m (Open Data Paris)
     */
    async checkNuisances(lat, lng) {
        // API réelle: opendata.paris.fr dataset=chantiers-perturbants
        await new Promise(resolve => setTimeout(resolve, 100));

        const hash = Math.abs(Math.cos(lat * lng) * 10000);
        const hasChantier = hash % 10 > 8; // 20% ont un chantier à côté

        return {
            hasChantier,
            message: hasChantier
                ? "Alerte Nuisance : Chantier perturbant détecté dans un rayon de 50m."
                : "Environnement dégagé (aucun chantier majeur signalé à proximité)."
        };
    }

    /**
     * Anomalie DVF: Vérifier le prix moyen au m2 du quartier via app.dvf.etalab.gouv.fr
     * Comparé au prix de cession.
     */
    async checkDvfAnomaly(prixCession, lat, lng) {
        // API DVF donne les prix des ventes immobilières, pour fonds de commerce c'est un proxy
        if (!prixCession) return null;

        const prixFonds = parseFloat(prixCession.replace(/€/g, '').replace(/\s/g, '').replace(/,/g, '.'));
        if (isNaN(prixFonds)) return null;

        // Prix moyen fictif par arrondissement (simulation)
        const prixMoyenQuartier = 120000;
        const decote = ((prixMoyenQuartier - prixFonds) / prixMoyenQuartier) * 100;

        const isAnomaly = decote > 50;

        return {
            prixMoyenQuartier,
            decote: decote.toFixed(1),
            isAnomaly,
            message: isAnomaly
                ? `Anomalie Opportunité ! Décote de ${decote.toFixed(1)}% par rapport à la moyenne du secteur.`
                : "Prix de cession dans les normes du secteur."
        };
    }
}

export const openDataEnricher = new OpenDataEnricher();
