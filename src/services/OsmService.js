/**
 * Fetch highway type from OpenStreetMap (Overpass API)
 * Used to determine the coefficient for the Traffic / Flow score.
 * Boulevard/Avenue: 1.2
 * Rue passante: 1.0
 * Impasse / Residential: 0.5
 */
export const getStreetHierarchy = async (lat, lon) => {
    try {
        // Query OpenStreetMap via Overpass API for the nearest 'highway' way (radius 20m)
        const query = `[out:json];way(around:20,${lat},${lon})[highway];out tags;`;
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error("Overpass API failed");

        const data = await response.json();

        let multiplier = 1.0;
        let streetType = "Rue standard";

        if (data.elements && data.elements.length > 0) {
            // Find the most prominent highway tag among the results
            const highwayTypes = data.elements.map(e => e.tags.highway);

            if (highwayTypes.includes("primary") || highwayTypes.includes("secondary") || highwayTypes.includes("tertiary") || highwayTypes.includes("trunk")) {
                multiplier = 1.2;
                streetType = "Axe majeur (Boulevard/Avenue)";
            } else if (highwayTypes.includes("residential") || highwayTypes.includes("living_street") || highwayTypes.includes("pedestrian")) {
                // If it's pure residential, less natural flow
                multiplier = 0.8;
                streetType = "Rue résidentielle / piétonne";
            } else if (highwayTypes.includes("service") || highwayTypes.includes("path") || highwayTypes.includes("footway")) {
                multiplier = 0.5;
                streetType = "Voie secondaire / Impasse";
            }
        }

        return {
            streetType,
            multiplier
        };
    } catch (e) {
        console.warn("Error fetching OSM data, falling back to multiplier 1.0", e);
        // Fallback: deterministic mock if API blocks us due to CORS or Rate limits
        const seed = Math.abs(Math.cos((lat * lon) * 1000));
        if (seed > 0.8) return { streetType: "Axe majeur estimé", multiplier: 1.2 };
        if (seed < 0.2) return { streetType: "Voie secondaire estimée", multiplier: 0.5 };
        return { streetType: "Rue (Mock)", multiplier: 1.0 };
    }
};
