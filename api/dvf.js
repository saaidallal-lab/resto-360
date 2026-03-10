export default async function handler(req, res) {
    // The frontend calls /api/dvf/75.csv.gz — extract the file path after /api/dvf/
    const filePath = req.url.replace(/^\/api\/dvf\/?/, '').split('?')[0];

    if (!filePath) {
        return res.status(400).json({ error: 'Missing file path (e.g. /api/dvf/75.csv.gz)' });
    }

    try {
        const url = `https://files.data.gouv.fr/geo-dvf/latest/csv/2023/departements/${filePath}`;
        const response = await fetch(url);

        if (!response.ok) {
            return res.status(response.status).json({
                error: `DVF source returned ${response.status}`,
                url
            });
        }

        // Forward the raw binary response (gzipped CSV)
        const buffer = Buffer.from(await response.arrayBuffer());

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
        res.setHeader('Content-Type', 'application/gzip');
        res.status(200).send(buffer);
    } catch (error) {
        console.error('DVF proxy error:', error);
        res.status(502).json({ error: 'DVF data source unavailable' });
    }
}
