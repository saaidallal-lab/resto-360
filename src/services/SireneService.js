/**
 * Estimation of Turnover (CA) using INPI/SIRENE API.
 * Method: For the nearest 3 neighbors (NAF 5610A) in a 40m radius, calculate:
 * CA_est = Employee Count * 85,000 EUR.
 */
export const estimateLocalCA = async (lat, lon) => {
    try {
        // Query SIRENE API for restaurants (56.10A) near the coordinates (40m radius = 0.04 km)
        // Note: The API parameter is radius in km.
        const url = `https://recherche-entreprises.api.gouv.fr/search?q=56.10A&limite=5&lat=${lat}&lon=${lon}&radius=0.04`;
        const response = await fetch(url);

        if (!response.ok) throw new Error("SIRENE API Failed");

        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            return { estimatedCA: 0, count: 0, message: "Aucun restaurant proche (40m)" };
        }

        let totalCA = 0;
        let evaluatedCount = 0;

        // Tranche Mapping (Code -> Average Employees)
        const effectifMapping = {
            "00": 0, // 0 employee
            "01": 1.5, // 1 or 2
            "02": 4, // 3 to 5
            "03": 7.5, // 6 to 9
            "11": 14.5, // 10 to 19
            "12": 34.5, // 20 to 49
            "21": 74.5, // 50 to 99
        };

        // Take only the top 3 neighbors
        const neighbors = data.results.slice(0, 3);

        for (const company of neighbors) {
            // Check if they publish CA
            let ca = null;
            if (company.finances && company.finances.length > 0) {
                const latestFinance = company.finances[0];
                if (latestFinance.chiffre_affaires) {
                    ca = latestFinance.chiffre_affaires;
                }
            }

            // Fallback to Employee Count Estimation
            if (!ca) {
                const tranche = company.tranche_effectif_salarie;
                let employees = 2; // default if unknown but active
                if (tranche && effectifMapping[tranche] !== undefined) {
                    employees = effectifMapping[tranche];
                }
                ca = employees * 85000;
            }

            totalCA += ca;
            evaluatedCount++;
        }

        const averageCA = Math.round(totalCA / evaluatedCount);
        return {
            estimatedCA: averageCA,
            count: evaluatedCount,
            message: `CA estimé (moyenne de ${evaluatedCount} voisins 56.10A) : ${averageCA.toLocaleString()} €`
        };

    } catch (error) {
        console.error("Sirene Estimation error:", error);
        return { estimatedCA: null, count: 0, message: "Données SIRENE indisponibles" };
    }
};

/**
 * Extraction (Smoke extraction duct) Potential.
 * Analyzes old SIRETs at the exact address to find former butchers (10.11Z), bakeries (10.71A) or restaurants (56.10A)
 */
export const detectExtractionPotential = async (address) => {
    try {
        const query = encodeURIComponent(address);
        // Query Sirene API for closed entities (or all) at this address
        const url = `https://recherche-entreprises.api.gouv.fr/search?q=${query}&limite=10`;
        const response = await fetch(url);

        if (!response.ok) return { hasExtraction: false, proof: "" };

        const data = await response.json();
        const targetNafs = ["10.11Z", "10.71A", "56.10A"];
        let foundExtraction = false;
        let proof = "";

        for (const company of (data.results || [])) {
            // Check current or past entities
            const naf = company.activite_principale;
            // Also check if any secondary establishments had these NAFs
            if (targetNafs.includes(naf) && company.etat_administratif === "C") {
                foundExtraction = true;
                proof = `Ancien établissement détecté : NAF ${naf}`;
                break;
            }

            // Or look into establishments
            if (!foundExtraction && company.matching_etablissements) {
                for (const etb of company.matching_etablissements) {
                    if (targetNafs.includes(etb.activite_principale) && etb.etat_administratif === "F") {
                        foundExtraction = true;
                        proof = `Ancien établissement détecté : NAF ${etb.activite_principale} à cette adresse`;
                        break;
                    }
                }
            }
            if (foundExtraction) break;
        }

        return {
            hasExtraction: foundExtraction,
            proof
        };
    } catch (e) {
        console.warn("Extraction detection failed:", e);
        return { hasExtraction: false, proof: "" };
    }
};
