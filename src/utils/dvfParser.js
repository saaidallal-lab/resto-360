/**
 * Fetch Demande de Valeurs Foncières (DVF) sales from the official Data.gouv CSV
 * We fetch the raw CSV from Etalab/geo-dvf.
 * Since the entire file for Paris is ~30MB gzipped, we download and stream the lines
 * to find the mutations corresponding to a precise postal code, filtering on commercial locales.
 */
import pako from 'pako'; // We'll need pako to gunzip in the browser realistically

// In a real application, doing this on the frontend is heavy if we download 30MB every time,
// but since the DVF APIs are down, this is the most robust workaround for a PoC.
// We'll fetch the 75 (Paris) department CSV.gz and parse it.

export async function fetchDVFSalesData(zipCode, maxResults = 50) {
    if (!zipCode || zipCode.length !== 5) return [];

    console.log(`[DVF] Fetching real estate sales data for ${zipCode}...`);
    // Convert 75011 to 75111 for INSEE codes (which DVF uses for code_commune)
    const inseeCode = zipCode.replace('0', '1');

    try {
        // Using Vite local proxy to bypass CORS on files.data.gouv.fr
        const url = `/api/dvf/75.csv.gz`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`[DVF] HTTP Error ${response.status} from geo-dvf`);
        }

        const arrayBuffer = await response.arrayBuffer();

        // Decompress the gzip file
        console.log(`[DVF] Decompressing ${Math.round(arrayBuffer.byteLength / 1024 / 1024 * 10) / 10}MB archive...`);
        let csvText = pako.inflate(new Uint8Array(arrayBuffer), { to: 'string' });

        const lines = csvText.split('\n');
        if (lines.length < 2) return [];

        const headers = lines[0].split(',');
        const communeIdx = headers.indexOf('code_commune');
        const typeIdx = headers.indexOf('code_type_local');
        const natureIdx = headers.indexOf('nature_mutation');

        const valeurIdx = headers.indexOf('valeur_fonciere');
        const surfaceIdx = headers.indexOf('surface_reelle_bati');
        const dateIdx = headers.indexOf('date_mutation');
        const numIdx = headers.indexOf('adresse_numero');
        const nomVoieIdx = headers.indexOf('adresse_nom_voie');
        const lonIdx = headers.indexOf('longitude');
        const latIdx = headers.indexOf('latitude');

        const sales = [];
        let count = 0;

        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',');
            if (row.length < headers.length) continue;

            // We want the specific INSEE commune, only "Vente", and code_type_local = 4 (Local commercial)
            if (row[communeIdx] === inseeCode && row[natureIdx] === 'Vente' && row[typeIdx] === '4') {
                const rawValeur = row[valeurIdx];
                const rawSurface = row[surfaceIdx];

                if (rawValeur && rawSurface) {
                    const valeur = parseFloat(rawValeur);
                    const surface = parseInt(rawSurface, 10);
                    if (valeur > 0 && surface > 0) {
                        sales.push({
                            id: i,
                            date: row[dateIdx],
                            valeur_fonciere: valeur,
                            surface: surface,
                            prix_m2: Math.round(valeur / surface),
                            adresse: `${row[numIdx] || ''} ${row[nomVoieIdx] || ''}`.trim(),
                            lon: parseFloat(row[lonIdx]),
                            lat: parseFloat(row[latIdx]),
                        });
                        count++;
                        if (count >= maxResults) break;
                    }
                }
            }
        }

        console.log(`[DVF] Extracted ${sales.length} commercial sales for ${zipCode}`);
        return sales;

    } catch (e) {
        console.error("[DVF] Error fetching or parsing data:", e);
        return [];
    }
}
