import React from 'react';

export default function Apply() {
    return (
        <div style={{ minHeight: '100vh', background: '#f7f7fa', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <form style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 16px rgba(61,75,156,0.08)', padding: '2rem', maxWidth: 400, width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h2 style={{ color: '#3D4B9C', marginBottom: '1rem', textAlign: 'center' }}>Apply for Subsidy</h2>
                <input type="text" placeholder="Name" required style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc' }} />
                <input type="text" placeholder="Farm Location" required style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc' }} />
                <input type="text" placeholder="Crop Type" required style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc' }} />
                <input type="number" placeholder="Area (in acres)" required style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc' }} />
                <input type="text" placeholder="Aadhaar Number" required style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc' }} />
                <button type="submit" style={{ background: '#3D4B9C', color: '#fff', padding: '0.75rem', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', marginTop: '1rem' }}>
                    Submit Application
                </button>
            </form>
        </div>
    );
} 