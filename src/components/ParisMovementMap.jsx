import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Circle } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { movementEngine } from '../services/MovementEngine.js';
import { monumentsService } from '../services/MonumentsService.js';
import { entrepriseEnricher } from '../services/EntrepriseEnricher.js';
import { AlertTriangle, TrendingUp, Wind, Sun, Building2, User, ExternalLink, Key, Gavel, ShoppingBag, MapPin, Landmark } from 'lucide-react';

const mapCenter = [48.8566, 2.3522];

const CATEGORIES = {
    LIQUIDATION: { label: 'Liquidations', color: '#dc2626', icon: Gavel, desc: 'Procédure Collective' },
    VENTE: { label: 'Cessions', color: '#2563eb', icon: ShoppingBag, desc: 'Cession de Fonds' },
    GERANCE: { label: 'Loc-Gérances', color: '#ea580c', icon: Key, desc: 'Location-Gérance' },
};

const createClusterCustomIcon = (cluster) => {
    const count = cluster.getChildCount();
    let size = 34, bg = '#6366f1';
    if (count > 50) { size = 46; bg = '#dc2626'; }
    else if (count > 20) { size = 40; bg = '#2563eb'; }
    return L.divIcon({
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};color:#fff;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px ${bg}50;border:2.5px solid #fff;font-family:Inter,-apple-system,sans-serif;">${count}</div>`,
        className: '',
        iconSize: L.point(size, size),
    });
};

// --- Styles (Light Design System) ---
const s = {
    card: {
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        padding: '1.25rem 1.5rem',
        marginBottom: '1rem',
    },
    badge: (bg, fg) => ({
        display: 'inline-flex', alignItems: 'center', gap: '3px',
        padding: '2px 8px', borderRadius: '6px', fontSize: '0.68rem',
        fontWeight: 600, background: bg, color: fg, whiteSpace: 'nowrap',
    }),
    checkbox: (active, color) => ({
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.45rem 0.85rem', borderRadius: '8px', cursor: 'pointer',
        border: `1.5px solid ${active ? color : '#e5e7eb'}`,
        background: active ? `${color}08` : '#fff',
        transition: 'all 0.2s ease', userSelect: 'none',
        opacity: active ? 1 : 0.5,
    }),
};

// --- Lazy Popup (loads ALL enrichment on popup open, then caches) ---
function PopupContent({ movement, nearbyMonuments }) {
    const [enriched, setEnriched] = useState(movement._enriched || false);
    const [dirigeant, setDirigeant] = useState(movement.dirigeant);
    const [terraceInfo, setTerraceInfo] = useState(movement.terraceInfo);
    const [extractionInfo, setExtractionInfo] = useState(movement.extractionInfo);
    const [nuisanceInfo, setNuisanceInfo] = useState(movement.nuisanceInfo);
    const [loading, setLoading] = useState(!movement._enriched);
    const cat = CATEGORIES[movement.markerType] || CATEGORIES.VENTE;

    useEffect(() => {
        if (movement._enriched) { setLoading(false); return; }
        let cancelled = false;

        (async () => {
            // Parallel: dirigeant + all OpenData enrichment
            const { openDataEnricher } = await import('../services/OpenDataEnricher.js');

            const [dirResult, terrace, extraction, nuisance] = await Promise.all([
                movement.siren
                    ? entrepriseEnricher.fetchDirigeant(movement.siren).catch(() => null)
                    : Promise.resolve(null),
                openDataEnricher.checkTerracePotential(movement.lat, movement.lng),
                openDataEnricher.checkExtractionDiagnostic(movement.naf || '56.10A', movement.activite),
                openDataEnricher.checkNuisances(movement.lat, movement.lng),
            ]);

            if (!cancelled) {
                const dirName = dirResult?.dirigeant || 'Non disponible';
                setDirigeant(dirName);
                setTerraceInfo(terrace);
                setExtractionInfo(extraction);
                setNuisanceInfo(nuisance);

                // Cache on the movement object — never re-fetch
                movement.dirigeant = dirName;
                movement.terraceInfo = terrace;
                movement.extractionInfo = extraction;
                movement.nuisanceInfo = nuisance;
                movement._enriched = true;
                setEnriched(true);
                setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [movement]);

    return (
        <div style={{ minWidth: '280px', fontFamily: "'Inter',-apple-system,sans-serif" }}>
            {/* Type */}
            <div style={{
                display: 'inline-block', padding: '2px 9px', borderRadius: '6px',
                background: `${cat.color}10`, color: cat.color,
                fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.04em', marginBottom: '8px',
            }}>
                {cat.desc}
            </div>

            {/* Titre */}
            <h3 style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a', margin: '0 0 10px 0', lineHeight: 1.3 }}>
                {movement.enseigne !== "Non spécifié" ? movement.enseigne : 'Local Commercial'}
            </h3>

            {/* 👤 Dirigeant */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '0.82rem', color: '#1e293b' }}>
                <User size={13} color="#6366f1" />
                {loading ? (
                    <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>Chargement...</span>
                ) : (
                    <span><strong>Dirigeant :</strong> {dirigeant}</span>
                )}
            </div>

            {/* 📝 Résumé activité */}
            {movement.activite && (
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '10px' }}>
                    {movement.activite.length > 65 ? movement.activite.substring(0, 65) + '…' : movement.activite}
                </div>
            )}

            {/* Badges métriques */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
                {movement.caProxy && (
                    <span style={s.badge('#dcfce7', '#166534')}>
                        <TrendingUp size={10} /> CA≈{(movement.caProxy / 1000).toFixed(0)}k€
                    </span>
                )}
                {movement.prix && (
                    <span style={s.badge('#e0e7ff', '#3730a3')}>
                        <Building2 size={10} /> {movement.prix}€
                    </span>
                )}
                {movement.isOpportunityAnomaly && (
                    <span style={s.badge('#fef3c7', '#92400e')}>
                        <AlertTriangle size={10} /> Anomalie DVF
                    </span>
                )}
            </div>

            {/* Fiche Flash (lazy-loaded) */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
                {loading && (
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontStyle: 'italic' }}>⏳ Analyse en cours...</span>
                )}
                {terraceInfo && (
                    <span style={s.badge(
                        terraceInfo.potential ? '#dcfce7' : '#f8fafc',
                        terraceInfo.potential ? '#166534' : '#94a3b8'
                    )}>
                        <Sun size={9} /> {terraceInfo.potential ? `☀ ${terraceInfo.trottoirWidth}m` : 'Terrasse ✗'}
                    </span>
                )}
                {extractionInfo && (
                    <span style={s.badge(
                        extractionInfo.isExtractionFriendly ? '#e0e7ff' : '#fef3c7',
                        extractionInfo.isExtractionFriendly ? '#3730a3' : '#92400e'
                    )}>
                        <Wind size={9} /> {extractionInfo.isExtractionFriendly ? 'Extract ✓' : 'Extract ?'}
                    </span>
                )}
                {nuisanceInfo && (
                    <span style={s.badge(
                        nuisanceInfo.hasChantier ? '#fee2e2' : '#f8fafc',
                        nuisanceInfo.hasChantier ? '#991b1b' : '#94a3b8'
                    )}>
                        {nuisanceInfo.hasChantier ? '🚧 Chantier' : '✓ Calme'}
                    </span>
                )}
            </div>

            {/* Badge Emplacement Touristique */}
            {nearbyMonuments.length > 0 && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px',
                    borderRadius: '8px', background: '#fef3c7', border: '1px solid #fcd34d',
                    marginBottom: '8px',
                }}>
                    <Landmark size={14} color="#d97706" />
                    <div style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: 600 }}>
                        🏛 Emplacement Touristique — {nearbyMonuments[0].name} ({nearbyMonuments[0].distance}m)
                    </div>
                </div>
            )}

            {/* Boutons */}
            <div style={{ marginTop: '8px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '6px' }}>
                <a href={movement.googleMapsUrl || '#'} target="_blank" rel="noreferrer"
                    style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                        padding: '8px 12px', borderRadius: '8px',
                        background: 'linear-gradient(135deg, #4285F4, #34A853)',
                        color: '#fff', fontSize: '0.76rem', fontWeight: 600, textDecoration: 'none',
                    }}>
                    📍 Voir sur Maps
                </a>
                <a href={movement.url || '#'} target="_blank" rel="noreferrer"
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                        padding: '8px 12px', borderRadius: '8px',
                        background: '#f1f5f9', color: '#475569',
                        fontSize: '0.76rem', fontWeight: 600, textDecoration: 'none',
                    }}>
                    <ExternalLink size={12} /> BODACC
                </a>
            </div>
        </div>
    );
}

// --- Monument Marker (visible at high zoom only) ---
function MonumentMarker({ monument }) {
    return (
        <CircleMarker
            center={[monument.lat, monument.lng]}
            radius={5}
            pathOptions={{ fillColor: '#d97706', fillOpacity: 0.6, color: '#d97706', weight: 1.5, opacity: 0.5 }}
        >
            <Popup>
                <div style={{ fontFamily: "'Inter',sans-serif", minWidth: '180px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                        <Landmark size={14} color="#d97706" />
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Monument Historique</span>
                    </div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>{monument.name}</h4>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>{monument.address}</p>
                </div>
            </Popup>
        </CircleMarker>
    );
}

// --- Main Map Component ---
export default function ParisMovementMap() {
    const [filters, setFilters] = useState({ LIQUIDATION: true, VENTE: true, GERANCE: true });

    // TanStack Query: cache les résultats (ne re-fetch jamais pendant la session)
    const { data: movements = [], isLoading, error } = useQuery({
        queryKey: ['parisMovements'],
        queryFn: () => movementEngine.fetchParisMovements(),
        staleTime: Infinity, // Jamais stale — les données BODACC ne changent pas en 10 min
    });

    const { data: monuments = [] } = useQuery({
        queryKey: ['parisMonuments'],
        queryFn: () => monumentsService.fetchMonuments(),
        staleTime: Infinity,
    });

    const filteredMovements = useMemo(() =>
        movements.filter(m => filters[m.markerType]),
        [movements, filters]
    );

    // Pre-compute nearby monuments for each movement
    const movementsWithMonuments = useMemo(() => {
        if (monuments.length === 0) return filteredMovements.map(m => ({ ...m, nearbyMonuments: [] }));
        return filteredMovements.map(m => ({
            ...m,
            nearbyMonuments: monumentsService.findNearbyMonuments(m.lat, m.lng, 150),
        }));
    }, [filteredMovements, monuments]);

    const toggleFilter = (key) => setFilters(prev => ({ ...prev, [key]: !prev[key] }));

    if (isLoading) {
        return (
            <div style={{ ...s.card, padding: '4rem 2rem', textAlign: 'center' }}>
                <div style={{
                    width: '40px', height: '40px', border: '3px solid #e5e7eb',
                    borderTopColor: '#6366f1', borderRadius: '50%',
                    animation: 'pmm-spin 0.75s linear infinite', margin: '0 auto 1.5rem auto'
                }}></div>
                <p style={{ color: '#1e293b', fontSize: '1rem', margin: '0 0 0.4rem 0', fontWeight: 500 }}>
                    Géocodage des mouvements parisiens (12 mois)...
                </p>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>
                    BODACC · Etalab · Open Data Paris
                </p>
                <style>{`@keyframes pmm-spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ ...s.card, textAlign: 'center', borderColor: '#fecaca' }}>
                <AlertTriangle size={28} color="#dc2626" style={{ margin: '0 auto 1rem', display: 'block' }} />
                <p style={{ color: '#dc2626', fontWeight: 600, margin: 0 }}>Erreur : {error.message}</p>
            </div>
        );
    }

    return (
        <div>
            {/* Header Card */}
            <div style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <MapPin size={20} color="#6366f1" />
                            Paris Movement Map
                            <span style={{
                                fontSize: '0.55rem', background: '#dcfce7', color: '#166534',
                                padding: '0.15rem 0.5rem', borderRadius: '9999px', textTransform: 'uppercase',
                                letterSpacing: '0.06em', fontWeight: 700
                            }}>12 MOIS</span>
                        </h2>
                        <p style={{ color: '#64748b', margin: '0.3rem 0 0 0', fontSize: '0.8rem' }}>
                            {filteredMovements.length} signaux sur {movements.length} · {monuments.length} monuments
                        </p>
                    </div>
                </div>

                {/* Checkbox Filters */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    {Object.entries(CATEGORIES).map(([key, cat]) => {
                        const count = movements.filter(m => m.markerType === key).length;
                        const active = filters[key];
                        const IconComp = cat.icon;
                        return (
                            <label key={key} style={s.checkbox(active, cat.color)}>
                                <input type="checkbox" checked={active} onChange={() => toggleFilter(key)} style={{ display: 'none' }} />
                                <div style={{
                                    width: '15px', height: '15px', borderRadius: '3px',
                                    border: `2px solid ${active ? cat.color : '#d1d5db'}`,
                                    background: active ? cat.color : '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.15s',
                                }}>
                                    {active && <span style={{ color: '#fff', fontSize: '9px', fontWeight: 700 }}>✓</span>}
                                </div>
                                <IconComp size={14} color={active ? cat.color : '#9ca3af'} />
                                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: active ? '#1e293b' : '#9ca3af' }}>
                                    {cat.label}
                                </span>
                                <span style={{
                                    fontSize: '0.62rem', fontWeight: 700, color: active ? '#fff' : '#9ca3af',
                                    background: active ? cat.color : '#f1f5f9',
                                    padding: '1px 6px', borderRadius: '9999px',
                                }}>
                                    {count}
                                </span>
                            </label>
                        );
                    })}
                </div>
            </div>

            {/* Map Card */}
            <div style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
                <div style={{ height: '650px', position: 'relative', zIndex: 0 }}>
                    <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                        {/* CartoDB Positron — light, clean, professional */}
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
                            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        />

                        {/* Monuments Historiques (petits cercles ambrés) */}
                        {monuments.map((mon, i) => (
                            <MonumentMarker key={`mon-${i}`} monument={mon} />
                        ))}

                        {/* Business Markers (clustered) */}
                        <MarkerClusterGroup
                            chunkedLoading
                            maxClusterRadius={40}
                            iconCreateFunction={createClusterCustomIcon}
                            spiderfyOnMaxZoom
                            showCoverageOnHover={false}
                        >
                            {movementsWithMonuments.map((m, idx) => {
                                const cat = CATEGORIES[m.markerType] || CATEGORIES.VENTE;
                                const hasTourist = m.nearbyMonuments.length > 0;
                                return (
                                    <CircleMarker
                                        key={`${m.id}-${idx}`}
                                        center={[m.lat, m.lng]}
                                        radius={hasTourist ? 10 : 8}
                                        pathOptions={{
                                            fillColor: cat.color,
                                            fillOpacity: 0.45,
                                            color: hasTourist ? '#d97706' : cat.color,
                                            weight: hasTourist ? 3 : 1.5,
                                            opacity: 0.65,
                                        }}
                                        eventHandlers={{
                                            mouseover: (e) => e.target.setStyle({ fillOpacity: 0.95, opacity: 1, weight: hasTourist ? 4 : 3 }),
                                            mouseout: (e) => e.target.setStyle({ fillOpacity: 0.45, opacity: 0.65, weight: hasTourist ? 3 : 1.5 }),
                                        }}
                                    >
                                        <Popup>
                                            <PopupContent movement={m} nearbyMonuments={m.nearbyMonuments} />
                                        </Popup>
                                    </CircleMarker>
                                );
                            })}
                        </MarkerClusterGroup>
                    </MapContainer>
                </div>
            </div>
        </div>
    );
}
