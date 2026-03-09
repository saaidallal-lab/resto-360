import React, { useState, useEffect } from 'react';
import { fetchBodaccLocationGerances } from '../utils/bodaccParser';
import { Store, AlertCircle, ShoppingBag, ExternalLink, MapPin, Navigation, FileSignature } from 'lucide-react';

export default function LocationGeranceOpportunities({ zipCode, city }) {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!zipCode && !city) return;

        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchBodaccLocationGerances({ zipCode, city, limit: 20 });
                setLocations(data || []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [zipCode, city]);

    if (!zipCode && !city) return null;

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                <Store size={48} style={{ margin: '0 auto 1rem', opacity: 0.5, animation: 'pulse 2s infinite' }} />
                <p>Recherche des locations-gérances en cours ({zipCode || city})...</p>
                <small>Analyse du BODACC pour détecter les opportunités de reprise de bail.</small>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '2rem', backgroundColor: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca', color: '#991b1b', marginTop: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
                    <AlertCircle size={24} />
                    <h3 style={{ margin: 0 }}>Erreur Data.gouv</h3>
                </div>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '4rem' }}>
            <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '0 0 0.5rem 0' }}>
                            <FileSignature size={24} style={{ color: '#f59e0b' }} />
                            Fonds en Location-Gérance ({zipCode})
                        </h2>
                        <p style={{ color: '#94a3b8', margin: 0 }}>
                            Établissements où l'exploitant n'est pas le propriétaire du fonds. Fort potentiel de rachat.
                        </p>
                    </div>
                </div>

                {locations.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f9fafb', borderRadius: '16px', border: '2px dashed #e5e7eb', color: '#6b7280' }}>
                        <p>Aucune location-gérance récente détectée sur ce secteur au BODACC.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '2rem' }}>
                        {locations.map((sale) => (
                            <div key={sale.id} className="glass-panel" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: sale.type === 'FIN_LOCATION_GERANCE' ? '4px solid #ef4444' : '4px solid #f59e0b' }}>
                                <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: sale.type === 'FIN_LOCATION_GERANCE' ? 'linear-gradient(145deg, rgba(239, 68, 68, 0.1), transparent)' : 'linear-gradient(145deg, rgba(245, 158, 11, 0.1), transparent)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem', textTransform: 'capitalize' }}>
                                            {sale.enseigne.toLowerCase()}
                                        </h3>
                                        <span style={{ fontSize: '0.85rem', color: '#94a3b8', background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                                            {sale.date}
                                        </span>
                                    </div>

                                    {sale.type === 'LOCATION_GERANCE' ? (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', background: 'rgba(245, 158, 11, 0.2)', color: '#fcd34d', padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                            <AlertCircle size={14} /> Opportunité : Sous Location-Gérance
                                        </span>
                                    ) : (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                            <AlertCircle size={14} /> Fin de location-gérance (Local probablement vacant)
                                        </span>
                                    )}

                                </div>
                                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>

                                    {sale.type === 'LOCATION_GERANCE' && (
                                        <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.85rem', color: '#cbd5e1', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                            💡 <strong>Note Pro :</strong> Le propriétaire du fonds n'est pas l'exploitant actuel. Fort potentiel de négociation pour un rachat de bail ou de fonds.
                                        </div>
                                    )}

                                    <div style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
                                        <strong>Activité :</strong> {sale.activite}
                                    </div>

                                    <div style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
                                        <strong>Adresse :</strong> {sale.adresse}
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        {sale.mapUrl && (
                                            <a href={sale.mapUrl} target="_blank" rel="noreferrer" style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                                color: '#38bdf8', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none'
                                            }}>
                                                <Navigation size={14} /> Google Maps
                                            </a>
                                        )}
                                        {sale.url && (
                                            <a href={sale.url} target="_blank" rel="noreferrer" style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                                color: '#a78bfa', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none'
                                            }}>
                                                Voir BODACC <ExternalLink size={14} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
