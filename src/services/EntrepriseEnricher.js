/**
 * Service d'enrichissement via l'API Annuaire des Entreprises (data.gouv.fr)
 * 100% gratuit, aucune clé API requise.
 * Récupère le nom du dirigeant principal à partir du SIREN.
 */

export class EntrepriseEnricher {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Récupère les infos d'une entreprise via l'API Recherche Entreprises
     * @param {string} siren - Le numéro SIREN (9 chiffres)
     * @returns {{ dirigeant: string, dateCreation: string, activite: string, effectif: string }}
     */
    async fetchDirigeant(siren) {
        if (!siren || siren === 'Non spécifié') return null;

        // Clean SIREN (remove spaces)
        const cleanSiren = siren.replace(/\s/g, '');
        if (cleanSiren.length < 9) return null;

        if (this.cache.has(cleanSiren)) return this.cache.get(cleanSiren);

        try {
            const url = `https://recherche-entreprises.api.gouv.fr/search?q=${cleanSiren}&page=1&per_page=1`;
            const res = await fetch(url);

            if (!res.ok) return null;

            const data = await res.json();

            if (data.results && data.results.length > 0) {
                const entreprise = data.results[0];
                const dirigeants = entreprise.dirigeants || [];

                let dirigeantNom = 'Non disponible';
                if (dirigeants.length > 0) {
                    const d = dirigeants[0];
                    dirigeantNom = `${d.prenom || ''} ${d.nom || ''}`.trim() || 'Non disponible';
                }

                const result = {
                    dirigeant: dirigeantNom,
                    dateCreation: entreprise.date_creation || null,
                    activite: entreprise.activite_principale || null,
                    effectifText: entreprise.tranche_effectif_salarie || null,
                    natureJuridique: entreprise.nature_juridique || null,
                };

                this.cache.set(cleanSiren, result);
                return result;
            }
        } catch (e) {
            console.warn(`[EntrepriseEnricher] Échec pour SIREN ${cleanSiren}:`, e.message);
        }

        return null;
    }

    /**
     * Génère un lien Google Maps universel (gratuit, sans API key)
     * @param {string} enseigne - Nom de l'établissement
     * @param {string} adresse - Adresse complète
     * @returns {string} - URL Google Maps
     */
    static generateGoogleMapsLink(enseigne, adresse) {
        const query = `${enseigne || 'Local Commercial'} ${adresse || ''}`.trim();
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    }
}

export const entrepriseEnricher = new EntrepriseEnricher();
