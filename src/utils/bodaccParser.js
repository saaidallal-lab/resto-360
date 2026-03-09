async function fetchSireneInfo(siren) {
    if (!siren) return null;

    const cleanSiren = siren.replace(/\s/g, '');
    if (cleanSiren.length !== 9) return null;

    try {
        const response = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${cleanSiren}`);
        if (!response.ok) return null;

        const data = await response.json();
        if (data.results && data.results.length > 0) {
            const result = data.results[0];

            let effectif = "Non renseigné";
            const effectifCode = result.tranche_effectif_salarie;

            if (effectifCode && effectifCode !== "NN") {
                const effectifsMap = {
                    "00": "0 salarié",
                    "01": "1 ou 2 salariés",
                    "02": "3 à 5 salariés",
                    "03": "6 à 9 salariés",
                    "11": "10 à 19 salariés",
                    "12": "20 à 49 salariés",
                    "21": "50 à 99 salariés",
                    "22": "100 à 199 salariés",
                };
                effectif = effectifsMap[effectifCode] || "Non renseigné";
            } else if (effectifCode === "00") {
                effectif = "0 salarié";
            }

            let dirigeantsStr = "";
            if (result.dirigeants && result.dirigeants.length > 0) {
                const dir = result.dirigeants[0];
                if (dir.prenoms || dir.nom) {
                    dirigeantsStr = `${dir.prenoms || ''} ${dir.nom || ''}`.trim();
                } else if (dir.denomination) {
                    dirigeantsStr = dir.denomination;
                }
            }

            return { effectif, dirigeant: dirigeantsStr || "Non spécifié" };
        }
    } catch (e) {
        console.error(`[SIRENE] Error fetching for ${cleanSiren}:`, e);
    }
    return null;
}

function extractSiren(fields) {
    if (fields.listepersonnes && typeof fields.listepersonnes === 'string') {
        try {
            const parsed = JSON.parse(fields.listepersonnes);
            const personne = parsed.personne || {};
            if (personne.numeroImmatriculation && personne.numeroImmatriculation.numeroIdentification) {
                return personne.numeroImmatriculation.numeroIdentification;
            }
        } catch (e) { }
    }

    if (fields.listeprecedentproprietaire && typeof fields.listeprecedentproprietaire === 'string') {
        try {
            const parsed = JSON.parse(fields.listeprecedentproprietaire);
            const personne = parsed.personne || {};
            if (personne.numeroImmatriculation && personne.numeroImmatriculation.numeroIdentification) {
                return personne.numeroImmatriculation.numeroIdentification;
            }
        } catch (e) { }
    }

    if (fields.registre) {
        const match = fields.registre.match(/\d{3}\s?\d{3}\s?\d{3}/);
        if (match) return match[0];
    }
    return null;
}

export async function fetchBodaccSales({ zipCode, city, limit = 10 }) {
    if (!zipCode && !city) return [];

    console.log(`[BODACC] Fetching fonds de commerce sales for ${zipCode || city}...`);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const dateStr = sixMonthsAgo.toISOString().split('T')[0];

    const baseUrl = 'https://bodacc-datadila.opendatasoft.com/api/records/1.0/search/?dataset=annonces-commerciales';
    let queryArgs = ['fonds de commerce (restaurant OR restauration OR brasserie OR cafe)'];

    if (city) {
        queryArgs.push(city);
    }
    queryArgs.push(`dateparution>=${dateStr}`);

    let url = `${baseUrl}&q=${encodeURIComponent(queryArgs.join(' '))}&refine.familleavis_lib=Ventes+et+cessions&rows=${limit * 10}`;

    if (zipCode) {
        url += `&refine.cp=${zipCode}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`[BODACC] HTTP Error ${response.status}`);
        }

        const json = await response.json();

        const rawRecords = [];

        for (const r of (json.records || [])) {
            const fields = r.fields || {};
            if (!fields.dateparution) continue;

            let activite = fields.activite || "";
            let nomEnseigne = fields.enseigne || fields.commercial || fields.denomination || "Non spécifié";
            let adresseStr = fields.adresse || "";
            let prixCession = null;

            if (fields.listepersonnes && typeof fields.listepersonnes === 'string') {
                try {
                    const parsed = JSON.parse(fields.listepersonnes);
                    const personne = parsed.personne || {};
                    if (personne.activite) activite = personne.activite;
                    if (personne.denomination) nomEnseigne = personne.denomination;
                    if (personne.nomCommercial) nomEnseigne = personne.nomCommercial;

                    if (personne.adresseSiegeSocial) {
                        const addr = personne.adresseSiegeSocial;
                        adresseStr = `${addr.numeroVoie || ''} ${addr.typeVoie || ''} ${addr.nomVoie || ''}`.trim();
                    }
                } catch (e) { }
            }

            if (fields.listeetablissements && typeof fields.listeetablissements === 'string') {
                try {
                    const parsedEstab = JSON.parse(fields.listeetablissements);
                    const estab = parsedEstab.etablissement || {};
                    const origine = estab.origineFonds || "";

                    const priceMatch = origine.match(/([0-9\s]+(?:[.,][0-9]+)?)\s*(?:euros?|eur|€)/i);
                    if (priceMatch) {
                        prixCession = priceMatch[1].replace(/\s/g, '');
                    }
                } catch (e) { }
            }

            if (!adresseStr) {
                adresseStr = fields.ville ? `${fields.ville} (${fields.cp})` : "Adresse non spécifiée";
            }

            if (!prixCession) continue;

            const siren = extractSiren(fields);

            rawRecords.push({
                id: r.recordid,
                date: fields.dateparution,
                enseigne: nomEnseigne,
                activite: activite,
                adresse: adresseStr,
                prix: prixCession,
                siren: siren,
                url: fields.url_complete,
                mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${adresseStr}, ${zipCode} ${fields.ville || ''}`)}`
            });
        }

        rawRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        const recentRecords = rawRecords.slice(0, limit);

        // SIRENE enrichment is now done lazily on popup click (EntrepriseEnricher)
        recentRecords.forEach(r => {
            r.effectif = r.effectif || "Non renseigné";
            r.dirigeant = null;
        });

        console.log(`[BODACC] Found ${recentRecords.length} recent business sales with prices`);
        return recentRecords;

    } catch (error) {
        console.error("[BODACC] Error fetching data:", error);
    }
}

export async function fetchBodaccLiquidations({ zipCode, city, limit = 10 }) {
    if (!zipCode && !city) return [];

    console.log(`[BODACC] Fetching cessations/liquidations for ${zipCode || city}...`);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const dateStr = sixMonthsAgo.toISOString().split('T')[0];

    const baseUrl = 'https://bodacc-datadila.opendatasoft.com/api/records/1.0/search/?dataset=annonces-commerciales';
    let queryArgs = ['restaurant OR restauration OR brasserie OR cafe'];

    if (city) {
        queryArgs.push(city);
    }
    queryArgs.push(`dateparution>=${dateStr}`);

    let url = `${baseUrl}&q=${encodeURIComponent(queryArgs.join(' '))}&refine.famille_avis=Procédures+collectives&rows=${limit * 10}`;

    if (zipCode) {
        url += `&refine.cp=${zipCode}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`[BODACC] HTTP Error ${response.status}`);
        }

        const json = await response.json();
        const rawRecords = [];

        for (const r of (json.records || [])) {
            const fields = r.fields || {};
            if (!fields.dateparution) continue;

            let activite = fields.activite || "";
            let nomEnseigne = fields.enseigne || fields.commercial || fields.denomination || "Non spécifié";
            let adresseStr = fields.adresse || "";

            if (fields.listepersonnes && typeof fields.listepersonnes === 'string') {
                try {
                    const parsed = JSON.parse(fields.listepersonnes);
                    const personne = parsed.personne || {};
                    if (personne.activite) activite = personne.activite;
                    if (personne.denomination) nomEnseigne = personne.denomination;
                    if (personne.nomCommercial) nomEnseigne = personne.nomCommercial;

                    if (personne.adresseSiegeSocial) {
                        const addr = personne.adresseSiegeSocial;
                        adresseStr = `${addr.numeroVoie || ''} ${addr.typeVoie || ''} ${addr.nomVoie || ''}`.trim();
                    }
                    if (personne.adressePP && !adresseStr) {
                        const addr = personne.adressePP;
                        adresseStr = `${addr.numeroVoie || ''} ${addr.typeVoie || ''} ${addr.nomVoie || ''}`.trim();
                    }
                } catch (e) { /* ignore */ }
            }

            if (!adresseStr) {
                adresseStr = fields.ville ? `${fields.ville} (${fields.cp})` : "Adresse non spécifiée";
            }

            const siren = extractSiren(fields);

            rawRecords.push({
                id: r.recordid,
                date: fields.dateparution,
                enseigne: nomEnseigne,
                activite: activite,
                adresse: adresseStr,
                siren: siren,
                url: fields.url_complete,
                mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${adresseStr}, ${zipCode} ${fields.ville || ''}`)}`
            });
        }

        rawRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        const recentRecords = rawRecords.slice(0, limit);

        // SIRENE enrichment is now done lazily on popup click (EntrepriseEnricher)
        recentRecords.forEach(r => {
            r.effectif = r.effectif || "Non renseigné";
            r.dirigeant = null;
        });

        console.log(`[BODACC] Found ${recentRecords.length} recent liquidations`);
        return recentRecords;

    } catch (error) {
        console.error("[BODACC] Error fetching liquidations:", error);
        return [];
    }
}

export async function fetchBodaccLocationGerances({ zipCode, city, limit = 10 }) {
    if (!zipCode && !city) return [];

    console.log(`[BODACC] Fetching locations-gérances for ${zipCode || city}...`);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const dateStr = sixMonthsAgo.toISOString().split('T')[0];

    const baseUrl = 'https://bodacc-datadila.opendatasoft.com/api/records/1.0/search/?dataset=annonces-commerciales';
    let queryArgs = ['("location-gérance" OR "locataire-gérant" OR "location gérance" OR "locataire gérant") AND (restaurant OR restauration OR brasserie OR cafe)'];

    if (city) {
        queryArgs.push(city);
    }
    queryArgs.push(`dateparution>=${dateStr}`);

    // Fetch more because we will filter locally
    let url = `${baseUrl}&q=${encodeURIComponent(queryArgs.join(' '))}&rows=${limit * 15}`;

    if (zipCode) {
        url += `&refine.cp=${zipCode}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`[BODACC] HTTP Error ${response.status}`);
        }

        const json = await response.json();
        const rawRecords = [];

        for (const r of (json.records || [])) {
            const fields = r.fields || {};
            if (!fields.dateparution) continue;

            const fullRecordStr = JSON.stringify(fields).toLowerCase();

            // Broad check because BODACC structure changes based on the court
            const isLocationGeranceActive = fullRecordStr.includes('location-gérance') ||
                fullRecordStr.includes('locataire-gérant') ||
                fullRecordStr.includes('location gérance') ||
                fullRecordStr.includes('locataire gérant');

            const isFinLocationGerance = fullRecordStr.includes('fin de location-gérance') ||
                fullRecordStr.includes('résiliation de la location-gérance') ||
                fullRecordStr.includes('fin de location gérance');

            if (!isLocationGeranceActive && !isFinLocationGerance) continue;

            let activite = fields.activite || "";
            let nomEnseigne = fields.enseigne || fields.commercial || fields.denomination || "Non spécifié";
            let adresseStr = fields.adresse || "";

            // Try to extract from nested JSON strings (BODACC quirk)
            if (fields.listepersonnes && typeof fields.listepersonnes === 'string') {
                try {
                    const parsed = JSON.parse(fields.listepersonnes);
                    const personne = parsed.personne || {};
                    if (personne.activite) activite = personne.activite;
                    if (personne.denomination) nomEnseigne = personne.denomination;
                    if (personne.nomCommercial) nomEnseigne = personne.nomCommercial;

                    if (personne.adresseSiegeSocial) {
                        const addr = personne.adresseSiegeSocial;
                        adresseStr = `${addr.numeroVoie || ''} ${addr.typeVoie || ''} ${addr.nomVoie || ''}`.trim();
                    }
                } catch (e) { /* ignore */ }
            }

            if (!adresseStr) {
                adresseStr = fields.ville ? `${fields.ville} (${fields.cp})` : "Adresse non spécifiée";
            }

            const siren = extractSiren(fields);

            // Clean up name if it's still missing but we have a commercial field
            if (nomEnseigne === "Non spécifié" && fields.commercant) {
                nomEnseigne = fields.commercant;
            }

            rawRecords.push({
                id: r.recordid,
                date: fields.dateparution,
                enseigne: nomEnseigne,
                activite: activite,
                adresse: adresseStr,
                siren: siren,
                type: isFinLocationGerance ? 'FIN_LOCATION_GERANCE' : 'LOCATION_GERANCE',
                url: fields.url_complete,
                mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${adresseStr}, ${zipCode} ${fields.ville || ''}`)}`
            });
        }

        // De-duplicate by ID 
        const uniqueMap = new Map();
        rawRecords.forEach(r => uniqueMap.set(r.id, r));
        const uniqueRecords = Array.from(uniqueMap.values());

        uniqueRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        const recentRecords = uniqueRecords.slice(0, limit);

        // SIRENE enrichment is now done lazily on popup click (EntrepriseEnricher)
        recentRecords.forEach(r => {
            r.effectif = r.effectif || "Non renseigné";
            r.dirigeant = null;
        });

        console.log(`[BODACC] Found ${recentRecords.length} recent location-gérances`);
        return recentRecords;

    } catch (error) {
        console.error("[BODACC] Error fetching location-gérances:", error);
        return [];
    }
}
