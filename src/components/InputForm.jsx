import React, { useState } from 'react';
import { ChefHat, Search, MapPin } from 'lucide-react';

const InputForm = ({ onSubmit }) => {
    const [formData, setFormData] = useState({
        city: '',
        zipCode: ''
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.city || formData.zipCode) {
            onSubmit(formData);
        }
    };

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 className="text-gradient" style={{ fontSize: '3rem', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                    <ChefHat size={48} color="var(--accent-primary)" />
                    Resto 360
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '500px' }}>
                    Recherchez par Ville et/ou par Arrondissement (Ex: Paris, 75011).
                </p>
            </div>

            <div className="glass-panel" style={{ padding: '2.5rem', width: '100%', maxWidth: '450px' }}>
                <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Vos Critères</h2>
                <form onSubmit={handleSubmit}>

                    <div className="form-group">
                        <label>Ville</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                name="city"
                                className="input-field"
                                value={formData.city}
                                onChange={handleChange}
                                placeholder="Ex: Paris"
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '1rem' }}>
                        <label>Code Postal / Arrondissement</label>
                        <div style={{ position: 'relative' }}>
                            <MapPin size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                name="zipCode"
                                className="input-field"
                                style={{ paddingLeft: '2.8rem' }}
                                value={formData.zipCode}
                                onChange={handleChange}
                                placeholder="Ex: 75011"
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '2rem' }} disabled={!formData.city && !formData.zipCode}>
                        <Search size={20} />
                        Lancer l'Analyse 360°
                    </button>
                </form>
            </div>
        </div>
    );
};

export default InputForm;
