// Format record
const normalizeName = (name) => {
    if (!name) return '';
    return name.toString().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9\s]/g, '') // Keep alphanumeric and spaces
        .replace(/\b(le|la|les|restaurant|brasserie|cafe|bar|bistrot)\b/g, '') // remove common words
        .replace(/\s+/g, ' ').trim(); // collapse spaces
};

const fetchTerracesByZip = async (zipCode) => {
    if (!zipCode) return [];
    try {
        const url = `https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/terrasses-autorisations/records?limit=1000&refine=arrondissement:${zipCode}`;
        const response = await fetch(url);
        const json = await response.json();
        return json.results || [];
    } catch (e) {
        console.error("Failed to fetch terraces", e);
        return [];
    }
};

// Simulated Google Places Data
const getSimulatedGooglePlaceData = (restaurantName) => {
    // In a real scenario, we would call the Google Places API:
    // 1. Find Place from Text (with restaurant name and address) -> get place_id
    // 2. Place Details (with place_id) -> get price_level, serves_outdoor_seating

    // Simulation logic based on deterministic aspects (checksum of name string)
    // to keep the data consistent across reloads for the same restaurant.
    let hash = 0;
    if (restaurantName) {
        for (let i = 0; i < restaurantName.length; i++) {
            hash = restaurantName.charCodeAt(i) + ((hash << 5) - hash);
        }
    }
    const absHash = Math.abs(hash);

    // Simulate price level (0 = free, 1 = Inexpensive, 2 = Moderate, 3 = Expensive, 4 = Very Expensive)
    // Defaulting most to 1 or 2.
    const priceLevelValue = absHash % 100;
    let price_level;
    if (priceLevelValue < 20) price_level = 1;      // 20% chance: Inexpensive (< 15€)
    else if (priceLevelValue < 75) price_level = 2; // 55% chance: Moderate (15€ - 30€)
    else if (priceLevelValue < 95) price_level = 3; // 20% chance: Expensive (30€ - 50€)
    else price_level = 4;                           // 5% chance: Very Expensive (> 50€)

    // Apply realism heuristics based on keywords in the name
    const nameLower = (restaurantName || "").toLowerCase();
    if (nameLower.includes('tour eiffel') || nameLower.includes('gastro') || nameLower.includes('palace') || nameLower.includes('ritz') || nameLower.includes('plaza')) {
        price_level = 4;
    } else if (nameLower.includes('brasserie') || nameLower.includes('boucher') || nameLower.includes('steak') || nameLower.includes('seafood')) {
        price_level = Math.max(3, price_level); // Brasseries in Paris usually 3 (30-50) or minimum 2
    } else if (nameLower.includes('bistrot') || nameLower.includes('bistro') || nameLower.includes('cafe')) {
        price_level = Math.max(2, price_level);
    } else if (nameLower.includes('kebab') || nameLower.includes('tacos') || nameLower.includes('burger') || nameLower.includes('snack') || nameLower.includes('pizza') || nameLower.includes('fast') || nameLower.includes('crepe') || nameLower.includes('sandwich')) {
        price_level = 1;
    }

    return {
        price_level: price_level
    };
};


const formatRecord = (fields) => {
    let baseRevenue = 50000 + Math.random() * 100000;

    if (fields.synthese_eval_sanit === 'A améliorer') {
        baseRevenue += Math.random() * 50000;
    } else if (fields.synthese_eval_sanit === 'A corriger de manière urgente') {
        baseRevenue -= Math.random() * 20000;
    }

    const name = fields.app_libelle_etablissement || fields.raison_sociale || 'Inconnu';
    const googleData = getSimulatedGooglePlaceData(name);

    return {
        id: fields.siret || Math.random().toString(),
        name: name,
        address: fields.adresse_2_ua || '',
        city: fields.localite || '',
        zipCode: fields.code_postal || '',
        department: fields.dep_code || '',
        rating: fields.synthese_eval_sanit || '',
        date: fields.date_inspection ? fields.date_inspection.substring(0, 10) : '',
        revenue: Math.max(0, Math.round(baseRevenue)),
        googlePlaceInfo: googleData
    };
};

export const searchRestaurants = async (query) => {
    if (!query || query.length < 3) return [];

    const baseUrl = 'https://dgal.opendatasoft.com/api/records/1.0/search/?dataset=export_alimconfiance';
    const url = `${baseUrl}&rows=10&q=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(url);
        const json = await response.json();
        return (json.records || []).map(r => formatRecord(r.fields || {}));
    } catch (e) {
        console.error(`Erreur d'API Data.gouv lors de la recherche`, e);
        return [];
    }
};

export const loadRestaurantsData = async (zipCode, city, dateMonth) => {
    if (!zipCode && !city && !dateMonth) return [];

    const baseUrl = 'https://dgal.opendatasoft.com/api/records/1.0/search/?dataset=export_alimconfiance';

    const fetchRatings = async (rating) => {
        let url = `${baseUrl}&rows=500&refine.synthese_eval_sanit=${encodeURIComponent(rating)}`;

        let queryParts = [];
        if (city) queryParts.push(city);

        if (zipCode) {
            url += `&refine.code_postal=${zipCode}`;
            if (queryParts.length > 0) {
                url += `&q=${encodeURIComponent(queryParts.join(' '))}`;
            }
        } else if (queryParts.length > 0) {
            url += `&q=${encodeURIComponent(queryParts.join(' '))}`;
        }

        try {
            const response = await fetch(url);
            const json = await response.json();
            return json.records || [];
        } catch (e) {
            console.error(`Erreur d'API Data.gouv pour ${rating}`, e);
            return [];
        }
    };

    const resultsAmeliorer = await fetchRatings('A améliorer');
    const resultsUrgente = await fetchRatings('A corriger de manière urgente');

    let terraces = [];
    if (zipCode && zipCode.startsWith('75')) {
        terraces = await fetchTerracesByZip(zipCode);
    } else if (city && city.toLowerCase().includes('paris')) {
        try {
            // Broad search for all Paris terraces.
            const url = `https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/terrasses-autorisations/records?limit=3000`;
            const response = await fetch(url);
            const json = await response.json();
            terraces = json.results || [];
        } catch (e) {
            console.error("Failed to fetch terraces globally", e);
        }
    }

    const allRecords = [...resultsAmeliorer, ...resultsUrgente];
    const enrichedData = [];

    for (const r of allRecords) {
        const fields = r.fields || {};
        const lib = (fields.app_libelle_activite_etablissement || '').toLowerCase();

        if (lib.includes('restaurant') || lib.includes('restauration')) {
            const recordDate = fields.date_inspection ? fields.date_inspection.substring(0, 7) : '';
            // Only add if date filter matches strictly
            if (!dateMonth || recordDate === dateMonth) {
                const restaurant = formatRecord(fields);

                // Match with terraces
                let hasTerrace = false;
                if (terraces.length > 0) {
                    const normRName = normalizeName(restaurant.name);
                    hasTerrace = terraces.some(t => {
                        const sameSiret = t.siret && restaurant.id && t.siret.toString() === restaurant.id.toString();
                        if (sameSiret) return true;

                        const normTNameEnseigne = normalizeName(t.nom_enseigne);
                        const normTNameSociete = normalizeName(t.nom_societe);

                        // Exact address zipCode match with name loose matching
                        if (restaurant.zipCode && t.arrondissement && t.arrondissement.toString() === restaurant.zipCode) {
                            if (normRName.length >= 4) {
                                if ((normTNameEnseigne && normTNameEnseigne.includes(normRName)) ||
                                    (normTNameSociete && normTNameSociete.includes(normRName)) ||
                                    (normTNameEnseigne && normRName.includes(normTNameEnseigne)) ||
                                    (normTNameSociete && normRName.includes(normTNameSociete))) {
                                    return true;
                                }
                            }
                        }

                        // Broad fallback if it's highly similar globally
                        if (normRName.length >= 5) {
                            if ((normTNameEnseigne && normTNameEnseigne.includes(normRName)) ||
                                (normTNameSociete && normTNameSociete.includes(normRName))) {
                                return true;
                            }
                        }

                        return false;
                    });
                }

                restaurant.hasTerrace = hasTerrace;
                enrichedData.push(restaurant);
            }
        }
    }

    return enrichedData;
};
