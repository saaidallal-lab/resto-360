export default async function handler(req, res) {
    const query = req.query.q || '';
    const limit = req.query.limit || '1';
    const citycode = req.query.citycode || '';

    const params = new URLSearchParams({ q: query, limit });
    if (citycode) params.append('citycode', citycode);

    try {
        const response = await fetch(
            `https://api-adresse.data.gouv.fr/search/?${params.toString()}`
        );
        const data = await response.json();

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
        res.status(200).json(data);
    } catch (error) {
        res.status(502).json({ error: 'Geocoding API unavailable' });
    }
}
