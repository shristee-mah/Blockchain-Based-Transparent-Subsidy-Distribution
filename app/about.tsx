import React from 'react';

export default function About() {
    return (
        <div style={{ minHeight: '100vh', background: '#f7f7fa', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 16px rgba(61,75,156,0.08)', padding: '2rem', maxWidth: 600, width: '100%' }}>
                <h2 style={{ color: '#3D4B9C', marginBottom: '1rem', textAlign: 'center' }}>About AgriChain Gov</h2>
                <p style={{ color: '#333', fontSize: '1.1rem', lineHeight: 1.7 }}>
                    AgriChain Gov is a government initiative to empower farmers by providing transparent, blockchain-based subsidy management. Our platform ensures that every application is securely recorded, easily tracked, and processed with integrity. We aim to make government support accessible, fair, and efficient for all farmers across the country.
                </p>
            </div>
        </div>
    );
} 