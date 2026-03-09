import React, { useState, useEffect } from 'react';
import { fetchBodaccSales, fetchBodaccLiquidations } from '../utils/bodaccParser';
import { fetchDVFSalesData } from '../utils/dvfParser';
import { geocodeAddress, getNearbyMetroFlow, getTerrassePotential, getNearbyChantiers } from '../services/GeoService';
import { getStreetHierarchy } from '../services/OsmService';
import { estimateLocalCA, detectExtractionPotential } from '../services/SireneService';
import { getPurchasingPower } from '../services/InseeService';
import { Store, AlertCircle, ShoppingBag, ExternalLink, AlertTriangle, MapPin, Users, UserRound, Navigation, Zap, Wind, Construction, Briefcase } from 'lucide-react';
import ScoreCard from './ScoreCard';

// Helper to compute Opportunity Score 
const computeOpportunityScore = async (sale, dvfAveragePrice, zipCode) => {
    // 1. Geolocate Address
    const coords = await geocodeAddress(sale.adresse, zipCode, "Paris");

    let fluxData = { totalFlow: 0, stations: [], minDistance: 350 };
    let pouvoirData = { localIncome: 25000, score: 10 };
    let chantiers = [];
    let terrasse = { possible: false, largeur: 0 };
    let streetData = { multiplier: 1.0, streetType: "Rue" };
    let caData = { estimatedCA: 0, count: 0 };
    let extractionData = { hasExtraction: false, proof: "" };

    if (coords) {
        // Fetch all Open Data points strictly in parallel for speed
        const [flux, chant, terr, strInfo, ca, ex] = await Promise.all([
            getNearbyMetroFlow(coords.lat, coords.lon, 300),
            getNearbyChantiers(coords.lat, coords.lon),
            getTerrassePotential(coords.lat, coords.lon),
            getStreetHierarchy(coords.lat, coords.lon),
            estimateLocalCA(coords.lat, coords.lon),
            detectExtractionPotential(sale.adresse)
        ]);
        fluxData = flux || fluxData;
        chantiers = chant || chantiers;
        terrasse = terr || terrasse;
        streetData = strInfo || streetData;
        caData = ca || caData;
        extractionData = ex || extractionData;
    }

    pouvoirData = await getPurchasingPower(zipCode);

    // ==========================================
    // Master Scoring Algorithm (Max 100 Points)
    // ==========================================

    // 1. Flux & Passage (35 pts max)
    let baseFluxScore = 0;
    if (fluxData.minDistance < 150) baseFluxScore = 29; // 29 * 1.2 = ~35
    else if (fluxData.minDistance <= 300) baseFluxScore = 18;

    let s_flux = Math.min(35, Math.round(baseFluxScore * streetData.multiplier));

    // 2. Qualité Immo (25 pts max)
    let s_immo = 10;
    const salePrice = parseInt(sale.prix || 0, 10);
    if (salePrice > 0 && dvfAveragePrice > 0) {
        // Very cheap compared to walls = 25, just ok = 15, bad = 5
        if (salePrice < dvfAveragePrice * 0.8) s_immo = 25;
        else if (salePrice < dvfAveragePrice) s_immo = 15;
        else s_immo = 5;
    }

    // 3. Pouvoir d'Achat (20 pts max)
    let s_pouvoir = pouvoirData.score;

    // 4. Bonus "Pépite" (20 pts max)
    let s_bonus = 0;
    if (terrasse.possible) s_bonus += 10;
    if (extractionData.hasExtraction) s_bonus += 10;

    const totalScore = s_flux + s_immo + s_pouvoir + s_bonus;

    return {
        totalScore,
        details: {
            flux: { score: s_flux, rawScore: s_flux, data: fluxData, streetData },
            pouvoirAchat: { score: s_pouvoir, rawScore: s_pouvoir, data: pouvoirData },
            immobilier: { score: s_immo, rawScore: s_immo, dvfAveragePrice },
            bonus: { score: s_bonus, terrasse, extractionData, chantiers, caData }
        }
    };
};


export default function RealEstateOpportunities({ zipCode, city }) {
    const [bodaccSales, setBodaccSales] = useState([]);
    const [bodaccLiquidations, setBodaccLiquidations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!zipCode && !city) return;

        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch DVF sales for real estate index
                let dvfAveragePrice = 0;
                if (zipCode && zipCode.startsWith('75')) {
                    const dvfData = await fetchDVFSalesData(zipCode, 50);
                    if (dvfData && dvfData.length > 0) {
                        const total = dvfData.reduce((acc, sale) => acc + sale.valeur_fonciere, 0);
                        dvfAveragePrice = total / dvfData.length;
                    }
                }

                // Fetch Bodacc API
                const [bodaccData, liqData] = await Promise.all([
                    fetchBodaccSales({ zipCode, city, limit: 15 }),
                    fetchBodaccLiquidations({ zipCode, city, limit: 15 })
                ]);

                // Compute scores for each sale
                const enrichedSales = await Promise.all((bodaccData || []).map(async (sale) => {
                    const opportunity = await computeOpportunityScore(sale, dvfAveragePrice, zipCode);
                    return { ...sale, opportunity };
                }));

                const enrichedLiquidations = await Promise.all((liqData || []).map(async (sale) => {
                    const opportunity = await computeOpportunityScore(sale, dvfAveragePrice, zipCode);
                    return { ...sale, opportunity };
                }));

                setBodaccSales(enrichedSales);
                setBodaccLiquidations(enrichedLiquidations);
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
                <p>Recherche d'opportunités et Calcul des Scores ({zipCode || city})...</p>
                <small>Analyse du flux piéton, du pouvoir d'achat et des prix immobiliers en cours.</small>
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

            {/* Section BODACC : Fonds de commerce */}
            <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '0 0 0.5rem 0' }}>
                            <ShoppingBag size={24} style={{ color: '#8b5cf6' }} />
                            Cessions de Fonds de Commerce ({zipCode})
                        </h2>
                        <p style={{ color: '#6b7280', margin: 0 }}>Fonds de commerce de restauration avec Score d'Opportunité (Sur 100)</p>
                    </div>
                </div>

                {bodaccSales.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f9fafb', borderRadius: '16px', border: '2px dashed #e5e7eb', color: '#6b7280' }}>
                        <p>Aucune cession avec prix de vente public trouvée récemment sur ce secteur au BODACC.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '2rem' }}>
                        {bodaccSales.map((sale) => (
                            <div key={sale.id} className="glass-panel" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(145deg, rgba(139, 92, 246, 0.1), transparent)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem', textTransform: 'capitalize' }}>
                                            {sale.enseigne.toLowerCase()}
                                        </h3>
                                        <span style={{ fontSize: '0.85rem', color: '#94a3b8', background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                                            {sale.date}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>{sale.activite}</div>
                                </div>
                                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.8rem' }}>
                                        <span style={{ color: '#94a3b8' }}>Prix de cession</span>
                                        <strong style={{ fontSize: '1.2rem', color: '#34d399' }}>{parseInt(sale.prix || 0).toLocaleString('fr-FR')} €</strong>
                                    </div>

                                    <div style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                                        <strong>Adresse :</strong> {sale.adresse}
                                    </div>

                                    {/* Data-Immo Metadata Tags */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        {sale.opportunity?.details?.bonus?.caData?.estimatedCA > 0 && (
                                            <span style={{ fontSize: '0.8rem', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '0.3rem 0.6rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.3rem', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                                                <Briefcase size={12} /> {sale.opportunity.details.bonus.caData.message}
                                            </span>
                                        )}
                                        {sale.opportunity?.details?.bonus?.terrasse?.possible && (
                                            <span style={{ fontSize: '0.8rem', background: 'rgba(250, 204, 21, 0.1)', color: '#facc15', padding: '0.3rem 0.6rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.3rem', border: '1px solid rgba(250, 204, 21, 0.2)' }}>
                                                ☀️ Valeur Latente: Terrasse
                                            </span>
                                        )}
                                        {sale.opportunity?.details?.bonus?.extractionData?.hasExtraction && (
                                            <span style={{ fontSize: '0.8rem', background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa', padding: '0.3rem 0.6rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.3rem', border: '1px solid rgba(167, 139, 250, 0.2)' }}>
                                                💨 {sale.opportunity.details.bonus.extractionData.proof}
                                            </span>
                                        )}
                                        {sale.opportunity?.details?.bonus?.chantiers?.length > 0 && (
                                            <span style={{ fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.3rem 0.6rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.3rem', border: '1px solid rgba(239, 68, 68, 0.2)', width: '100%' }}>
                                                <Construction size={12} /> Alerte Travaux ({sale.opportunity.details.bonus.chantiers.length} chantier(s) à &lt; 50m)
                                            </span>
                                        )}
                                    </div>

                                    {/* Component ScoreCard injected here */}
                                    <ScoreCard scoreData={sale.opportunity} />

                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '1rem' }}>
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

            {/* Section BODACC : Liquidations */}
            <section style={{ marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '0 0 0.5rem 0', color: '#f87171' }}>
                            <AlertTriangle size={24} />
                            Fonds de Commerce en Liquidation ({zipCode})
                        </h2>
                        <p style={{ color: '#94a3b8', margin: 0 }}>Opportunités de rachat à bas coût ou locaux vacants</p>
                    </div>
                </div>

                {bodaccLiquidations.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '16px', border: '2px dashed rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                        <p>Aucune procédure collective récente trouvée sur ce secteur.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '2rem' }}>
                        {bodaccLiquidations.map((sale) => (
                            <div key={sale.id} className="glass-panel" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: '4px solid #ef4444' }}>
                                <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(145deg, rgba(239, 68, 68, 0.1), transparent)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem', textTransform: 'capitalize', color: '#fca5a5' }}>
                                            {sale.enseigne.toLowerCase()}
                                        </h3>
                                    </div>
                                    <span style={{ fontSize: '0.85rem', color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '999px', display: 'inline-block' }}>
                                        Parution le {sale.date}
                                    </span>
                                </div>
                                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                                    <div style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
                                        <strong>Activité :</strong> {sale.activite}
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                                        <strong>Adresse :</strong> {sale.adresse}
                                    </div>

                                    {/* Data-Immo Metadata Tags */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        {sale.opportunity?.details?.bonus?.caData?.estimatedCA > 0 && (
                                            <span style={{ fontSize: '0.8rem', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '0.3rem 0.6rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.3rem', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                                                <Briefcase size={12} /> {sale.opportunity.details.bonus.caData.message}
                                            </span>
                                        )}
                                        {sale.opportunity?.details?.bonus?.terrasse?.possible && (
                                            <span style={{ fontSize: '0.8rem', background: 'rgba(250, 204, 21, 0.1)', color: '#facc15', padding: '0.3rem 0.6rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.3rem', border: '1px solid rgba(250, 204, 21, 0.2)' }}>
                                                ☀️ Valeur Latente: Terrasse
                                            </span>
                                        )}
                                        {sale.opportunity?.details?.bonus?.extractionData?.hasExtraction && (
                                            <span style={{ fontSize: '0.8rem', background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa', padding: '0.3rem 0.6rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.3rem', border: '1px solid rgba(167, 139, 250, 0.2)' }}>
                                                💨 {sale.opportunity.details.bonus.extractionData.proof}
                                            </span>
                                        )}
                                        {sale.opportunity?.details?.bonus?.chantiers?.length > 0 && (
                                            <span style={{ fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.3rem 0.6rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.3rem', border: '1px solid rgba(239, 68, 68, 0.2)', width: '100%' }}>
                                                <Construction size={12} /> Alerte Travaux ({sale.opportunity.details.bonus.chantiers.length} chantier(s) à &lt; 50m)
                                            </span>
                                        )}
                                    </div>

                                    {/* Component ScoreCard injected here */}
                                    <ScoreCard scoreData={sale.opportunity} />

                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '1rem' }}>
                                        {sale.mapUrl && (
                                            <a href={sale.mapUrl} target="_blank" rel="noreferrer" style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                                color: '#f87171', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none'
                                            }}>
                                                <Navigation size={14} /> Google Maps
                                            </a>
                                        )}
                                        {sale.url && (
                                            <a href={sale.url} target="_blank" rel="noreferrer" style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                                color: '#fca5a5', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none'
                                            }}>
                                                Voir la procédure <ExternalLink size={14} />
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
