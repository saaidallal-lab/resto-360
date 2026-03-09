import React, { useEffect, useState, Suspense, lazy } from 'react';
import { loadRestaurantsData } from '../utils/dataParser';
import { Users, AlertTriangle, TrendingUp, ArrowLeft, MapPin, Navigation, Receipt, Sun, Building2, Store, FileSignature, Map } from 'lucide-react';
import RealEstateOpportunities from './RealEstateOpportunities';
import LocationGeranceOpportunities from './LocationGeranceOpportunities';

// Code-splitting : la carte Leaflet est chargée uniquement quand l'onglet est cliqué
const ParisMovementMap = lazy(() => import('./ParisMovementMap'));

const getPhotoUrl = (item) => {
    // Generates a free Google Maps embed URL showing the street view / map location
    const query = `${item.name} ${item.address} ${item.zipCode} ${item.city}`;
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=k&z=17&ie=UTF8&iwloc=&output=embed`;
};

const getGoogleMapsUrl = (item) => {
    const query = `${item.name} ${item.address} ${item.zipCode} ${item.city}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

const getPriceLevelText = (level) => {
    switch (level) {
        case 1: return "€ (Moins de 15€)";
        case 2: return "€€ (15€ - 30€)";
        case 3: return "€€€ (30€ - 50€)";
        case 4: return "€€€€ (50€+)";
        default: return "Non renseigné";
    }
};

const parseUserData = (userData) => {
    return {
        zipCode: (userData.zipCode || '').trim(),
        city: (userData.city || '').trim(),
        dateMonth: userData.dateMonth
    };
};

const Dashboard = ({ userData, onGoBack }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('concurrents'); // 'concurrents' | 'immobilier' | 'gerance' | 'map'

    // Extract search parameters
    const searchParams = parseUserData(userData);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const results = await loadRestaurantsData(searchParams.zipCode, searchParams.city, searchParams.dateMonth);
                // Sort by date descending (latest first)
                results.sort((a, b) => new Date(b.date) - new Date(a.date));
                setData(results);
            } catch (error) {
                console.error("Error loading data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [userData]);

    if (loading) {
        return (
            <div className="app-container fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                <h2 className="text-gradient">Chargement de l'analyse 360°...</h2>
            </div>
        );
    }

    const totalCompetitors = data.length;
    const avgRevenue = totalCompetitors > 0
        ? Math.round(data.reduce((acc, curr) => acc + curr.revenue, 0) / totalCompetitors)
        : 0;
    const formattedRevenue = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(avgRevenue);
    const urgentCount = data.filter(r => r.rating === 'A corriger de manière urgente').length;

    return (
        <div className="app-container fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ margin: 0 }}>Analyse marché <span className="text-gradient">{userData.city || userData.zipCode || (userData.dateMonth ? `Mois: ${userData.dateMonth}` : 'Global')}</span></h1>
                    <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MapPin size={16} />
                        Hygiène, Concurrence & Immobilier Commercial
                    </p>
                </div>
                <button className="btn-secondary" onClick={onGoBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowLeft size={16} /> Retour
                </button>
            </div>

            {/* View Toggle */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                <button
                    onClick={() => setViewMode('concurrents')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        fontWeight: 600,
                        background: viewMode === 'concurrents' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                        color: viewMode === 'concurrents' ? '#60a5fa' : 'var(--text-muted)',
                        borderBottom: viewMode === 'concurrents' ? '2px solid #3b82f6' : '2px solid transparent',
                        flexShrink: 0
                    }}
                >
                    <Store size={18} /> Concurrents (Hygiène)
                </button>
                <button
                    onClick={() => setViewMode('immobilier')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        fontWeight: 600,
                        background: viewMode === 'immobilier' ? 'rgba(14, 165, 233, 0.15)' : 'transparent',
                        color: viewMode === 'immobilier' ? '#38bdf8' : 'var(--text-muted)',
                        borderBottom: viewMode === 'immobilier' ? '2px solid #0ea5e9' : '2px solid transparent',
                        flexShrink: 0
                    }}
                >
                    <Building2 size={18} /> Locaux & Opportunités
                </button>
                <button
                    onClick={() => setViewMode('gerance')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        fontWeight: 600,
                        background: viewMode === 'gerance' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                        color: viewMode === 'gerance' ? '#fcd34d' : 'var(--text-muted)',
                        borderBottom: viewMode === 'gerance' ? '2px solid #f59e0b' : '2px solid transparent',
                        flexShrink: 0
                    }}
                >
                    <FileSignature size={18} /> Locations-Gérances
                </button>
                <button
                    onClick={() => setViewMode('map')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        fontWeight: 600,
                        background: viewMode === 'map' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                        color: viewMode === 'map' ? '#34d399' : 'var(--text-muted)',
                        borderBottom: viewMode === 'map' ? '2px solid #10b981' : '2px solid transparent',
                        flexShrink: 0
                    }}
                >
                    <Map size={18} /> Paris Movement Map
                </button>
            </div>

            {viewMode === 'map' && (
                <Suspense fallback={
                    <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-muted)' }}>Chargement du module carte...</p>
                    </div>
                }>
                    <ParisMovementMap />
                </Suspense>
            )}

            {viewMode === 'immobilier' && (
                <RealEstateOpportunities zipCode={searchParams.zipCode} city={searchParams.city} />
            )}

            {viewMode === 'gerance' && (
                <LocationGeranceOpportunities zipCode={searchParams.zipCode} city={searchParams.city} />
            )}

            {viewMode === 'concurrents' && (
                <>
                    {/* KPI Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '1rem', borderRadius: '12px' }}>
                                <Users size={32} color="var(--accent-primary)" />
                            </div>
                            <div>
                                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Concurrents (Mauvaise Hygiène)</p>
                                <h2 style={{ margin: 0, fontSize: '2rem' }}>{totalCompetitors}</h2>
                            </div>
                        </div>
                        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ background: 'rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '12px' }}>
                                <AlertTriangle size={32} color="var(--danger)" />
                            </div>
                            <div>
                                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Fermeture urgente</p>
                                <h2 style={{ margin: 0, fontSize: '2rem' }}>{urgentCount}</h2>
                            </div>
                        </div>
                        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ background: 'rgba(139, 92, 246, 0.2)', padding: '1rem', borderRadius: '12px' }}>
                                <TrendingUp size={32} color="var(--accent-secondary)" />
                            </div>
                            <div>
                                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>CA Moyen Estimé</p>
                                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{formattedRevenue}</h2>
                            </div>
                        </div>
                    </div>

                    {/* Competitor List */}
                    <div>
                        <h2 style={{ marginBottom: '1.5rem' }}>Détail des Établissements</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
                            {data.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)' }}>Aucun établissement trouvé dans votre secteur.</p>
                            ) : (
                                data.map((item, idx) => (
                                    <div key={idx} className="glass-panel" style={{ padding: 0, overflow: 'hidden', transition: 'transform 0.2s', cursor: 'default', display: 'flex', flexDirection: 'column' }}
                                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                                        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        {/* Restaurant Photo */}
                                        <div style={{ position: 'relative', width: '100%', height: '160px', overflow: 'hidden', background: 'rgba(0,0,0,0.3)' }}>
                                            <iframe
                                                src={getPhotoUrl(item)}
                                                title={`Carte ${item.name}`}
                                                width="100%"
                                                height="100%"
                                                style={{ border: 0, opacity: 0.9, filter: 'grayscale(20%)' }}
                                                allowFullScreen=""
                                                loading="lazy"
                                                referrerPolicy="no-referrer-when-downgrade"
                                            ></iframe>

                                        </div>

                                        {/* Card Body */}
                                        <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                            <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                {item.name}
                                                {item.hasTerrace && (
                                                    <span title="Terrasse Autorisée (Data.gouv)" style={{ color: '#f59e0b', display: 'flex' }}>
                                                        <Sun size={18} />
                                                    </span>
                                                )}
                                            </h3>
                                            <p style={{ margin: '0 0 0.75rem 0', color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <MapPin size={14} /> {item.address}, {item.zipCode} {item.city}
                                            </p>

                                            {item.googlePlaceInfo?.price_level && (
                                                <p style={{ margin: '0 0 0.75rem 0', color: '#22c55e', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <Receipt size={14} /> Ticket moyen (Google) : {getPriceLevelText(item.googlePlaceInfo.price_level)}
                                                </p>
                                            )}

                                            {item.date && (
                                                <p style={{ margin: '0 0 0.75rem 0', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                                    Inspecté le : {item.date}
                                                </p>
                                            )}

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                                <span style={{
                                                    padding: '0.35rem 0.85rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700',
                                                    background: item.rating.includes('urgente') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                                    color: item.rating.includes('urgente') ? 'var(--danger)' : 'var(--accent-secondary)',
                                                    border: `1px solid ${item.rating.includes('urgente') ? 'var(--danger)' : 'var(--accent-secondary)'}`
                                                }}>
                                                    {item.rating.includes('urgente') ? '⚠ URGENT' : '⚡ À améliorer'}
                                                </span>

                                                <a
                                                    href={getGoogleMapsUrl(item)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                                        padding: '0.4rem 0.85rem', borderRadius: '8px',
                                                        background: 'linear-gradient(135deg, #4285F4, #34A853)',
                                                        color: '#fff', fontSize: '0.8rem', fontWeight: '600',
                                                        textDecoration: 'none', transition: 'opacity 0.2s'
                                                    }}
                                                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.85'}
                                                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                                                >
                                                    <Navigation size={14} /> Google Maps
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Dashboard;
