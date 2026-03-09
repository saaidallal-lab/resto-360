import React from 'react';
import { Navigation, Wallet, TrendingDown, Target } from 'lucide-react';

const ScoreCard = ({ scoreData }) => {
    if (!scoreData) return null;

    const { totalScore, details } = scoreData;
    const { flux, pouvoirAchat, immobilier, bonus } = details;

    // Determine color based on score
    let scoreColor = '#ef4444'; // Red for low
    if (totalScore >= 70) scoreColor = '#22c55e'; // Green for excellent
    else if (totalScore >= 50) scoreColor = '#f59e0b'; // Orange for average

    return (
        <div style={{
            background: 'linear-gradient(145deg, #1e293b, #0f172a)',
            borderRadius: '16px',
            padding: '1.5rem',
            color: 'white',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
            marginTop: '1rem'
        }}>
            <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#cbd5e1' }}>
                <Target size={18} />
                Score d'Opportunité
            </h4>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{
                    width: '80px', height: '80px', borderRadius: '50%',
                    background: `conic-gradient(${scoreColor} ${totalScore}%, #334155 ${totalScore}%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', flexShrink: 0
                }}>
                    <div style={{
                        width: '65px', height: '65px', borderRadius: '50%',
                        background: '#0f172a', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', flexDirection: 'column'
                    }}>
                        <span style={{ fontSize: '1.6rem', fontWeight: 'bold', color: scoreColor, lineHeight: 1 }}>{Math.round(totalScore)}</span>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>/100</span>
                    </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1' }}>
                        Évaluation algorithmique experte basée sur l'Open Data (Flux métro, Immo, Insee, et bonus métier).
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {/* Flux Score */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}>
                            <Navigation size={14} /> Flux & Passage
                        </span>
                        <strong style={{ color: flux.score > 15 ? '#38bdf8' : '#64748b' }}>{flux.score} / 35 pts</strong>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: '#334155', borderRadius: '2px', overflow: 'hidden', marginTop: '0.2rem' }}>
                        <div style={{ width: `${(flux.score / 35) * 100}%`, height: '100%', background: '#38bdf8' }}></div>
                    </div>
                </div>

                {/* Immo Score */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}>
                            <TrendingDown size={14} /> Qualité Prix (Immo)
                        </span>
                        <strong style={{ color: immobilier.score > 10 ? '#34d399' : '#64748b' }}>{immobilier.score} / 25 pts</strong>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: '#334155', borderRadius: '2px', overflow: 'hidden', marginTop: '0.2rem' }}>
                        <div style={{ width: `${(immobilier.score / 25) * 100}%`, height: '100%', background: '#34d399' }}></div>
                    </div>
                </div>

                {/* Pouvoir d'Achat Score */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}>
                            <Wallet size={14} /> Pouvoir d'Achat local
                        </span>
                        <strong style={{ color: pouvoirAchat.score > 10 ? '#a78bfa' : '#64748b' }}>{pouvoirAchat.score} / 20 pts</strong>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: '#334155', borderRadius: '2px', overflow: 'hidden', marginTop: '0.2rem' }}>
                        <div style={{ width: `${(pouvoirAchat.score / 20) * 100}%`, height: '100%', background: '#a78bfa' }}></div>
                    </div>
                </div>

                {/* Bonus Pépite */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}>
                            ★ Bonus "Pépite"
                        </span>
                        <strong style={{ color: bonus.score > 0 ? '#fbbf24' : '#64748b' }}>{bonus.score} / 20 pts</strong>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: '#334155', borderRadius: '2px', overflow: 'hidden', marginTop: '0.2rem' }}>
                        <div style={{ width: `${(bonus.score / 20) * 100}%`, height: '100%', background: '#fbbf24' }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScoreCard;
