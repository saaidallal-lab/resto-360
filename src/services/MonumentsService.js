/**
 * Service Monuments Historiques de Paris
 * Source : Open Data Paris — Monuments historiques classés ou inscrits
 * 100% gratuit, aucune clé API requise.
 */

const MONUMENTS_API = 'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/les-monuments-historiques-classes-et-inscrits/records';

export class MonumentsService {
    constructor() {
        this.monuments = null;
    }

    /**
     * Récupère les monuments historiques de Paris (avec coordonnées GPS).
     * Résultat caché après le premier appel.
     */
    async fetchMonuments() {
        if (this.monuments) return this.monuments;

        try {
            const url = `${MONUMENTS_API}?limit=100&select=appellation_courante,adresse,geo_point_2d&where=geo_point_2d is not null`;
            const res = await fetch(url);
            if (!res.ok) return [];

            const data = await res.json();
            const results = (data.results || []).map(m => ({
                name: m.appellation_courante || 'Monument Historique',
                address: m.adresse || '',
                lat: m.geo_point_2d?.lat,
                lng: m.geo_point_2d?.lon,
            })).filter(m => m.lat && m.lng);

            this.monuments = results;
            return results;
        } catch (e) {
            console.warn('[MonumentsService] Échec:', e.message);
            return [];
        }
    }

    /**
     * Calcule la distance en mètres entre deux points GPS (Haversine).
     */
    static distanceMeters(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    /**
     * Trouve les monuments à moins de `radiusM` mètres d'un point.
     */
    findNearbyMonuments(lat, lng, radiusM = 150) {
        if (!this.monuments) return [];
        return this.monuments
            .map(m => ({
                ...m,
                distance: Math.round(MonumentsService.distanceMeters(lat, lng, m.lat, m.lng))
            }))
            .filter(m => m.distance <= radiusM)
            .sort((a, b) => a.distance - b.distance);
    }
}

export const monumentsService = new MonumentsService();
