"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from "next/navigation";


export default function KYCDetails() {
    const router = useRouter();
    const { locale } = useParams() as { locale: string };
    const [form, setForm] = useState({
        citizenshipNumber: '',
        citizenshipIssuedDate: '',
        maritalStatus: 'unmarried',
        spouseName: '',
        province: '',
        district: '',
        ruralMunicipality: '',
        tole: '',
        wardNumber: '',
        fatherName: '',
        motherName: ''
    });

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    // function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    //     e.preventDefault();
    //     router.push(`/${locale}/apply/scheme`);
    //     console.log("Locale:", locale);
    //     console.log("Routing to:", `/${locale}/apply/scheme`);
    // }
    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const application_id = localStorage.getItem("application_id");

        const data = {
            application_id: application_id,
            citizenship_no: form.citizenshipNumber,
            issued_date: form.citizenshipIssuedDate,
            marital_status: form.maritalStatus,
            province: form.province,
            district: form.district,
            municipality: form.ruralMunicipality,
            tole: form.tole,
            ward_no: form.wardNumber,
            father_name: form.fatherName,
            mother_name: form.motherName
        };

        try {
            const response = await fetch("/api/save-kyc", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            console.log(result);
            router.push(`/${locale}/apply/scheme`);

        } catch (error) {
            console.error("Error saving KYC:", error);
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#F0EAD6',
            padding: '2rem',
            fontFamily: 'Arial, sans-serif'
        }}>
            {/* Progress Bar */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: '3rem',
                gap: '1rem'
            }}>
                {[
                    { number: 1, label: 'General Details', active: false },
                    { number: 2, label: 'KYC Details', active: true },
                    { number: 3, label: 'Subsidy Scheme', active: false },
                    { number: 4, label: 'Upload Document', active: false },
                    { number: 5, label: 'User Agreement', active: false },
                    { number: 6, label: 'Completed', active: false }
                ].map((step, index) => (
                    <div key={step.number} style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: step.active ? '#3D4B9C' : '#ccc',
                            color: step.active ? '#fff' : '#666',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '14px'
                        }}>
                            {step.number}
                        </div>
                        <span style={{
                            marginLeft: '8px',
                            color: step.active ? '#3D4B9C' : '#666',
                            fontSize: '12px',
                            fontWeight: step.active ? 'bold' : 'normal'
                        }}>
                            {step.label}
                        </span>
                        {index < 5 && (
                            <div style={{
                                width: '40px',
                                height: '2px',
                                background: '#ccc',
                                margin: '0 8px'
                            }}></div>
                        )}
                    </div>
                ))}
            </div>

            {/* Form Container */}
            <div style={{
                maxWidth: '800px',
                width: '100%',
                margin: '0 auto',
                background: '#fff',
                borderRadius: '12px',
                padding: '2rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
                <h2 style={{
                    color: '#3D4B9C',
                    fontSize: '1.8rem',
                    marginBottom: '2rem',
                    textAlign: 'center'
                }}>
                    KYC Details
                </h2>

                <form style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} onSubmit={handleSubmit}>
                    {/* Citizenship Number */}
                    <div>
                        <label style={{ color: '#3D4B9C', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Citizenship Number <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="text"
                            name="citizenshipNumber"
                            value={form.citizenshipNumber}
                            onChange={handleChange}
                            placeholder="Citizenship Number"
                            required
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', background: '#fff', color: '#2c2c2c' }}
                        />
                    </div>

                    {/* Citizenship Issued Date */}
                    <div>
                        <label style={{ color: '#3D4B9C', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Citizenship Issued Date <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="text"
                            name="citizenshipIssuedDate"
                            value={form.citizenshipIssuedDate}
                            onChange={handleChange}
                            placeholder="YYYY-MM-DD (BS)"
                            required
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', background: '#fff', color: '#2c2c2c' }}
                        />
                    </div>

                    {/* Marital Status */}
                    <div>
                        <label style={{ color: '#3D4B9C', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Marital Status <span style={{ color: 'red' }}>*</span></label>
                        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="radio"
                                    name="maritalStatus"
                                    value="unmarried"
                                    checked={form.maritalStatus === 'unmarried'}
                                    onChange={handleChange}
                                />
                                <span>Unmarried</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="radio"
                                    name="maritalStatus"
                                    value="married"
                                    checked={form.maritalStatus === 'married'}
                                    onChange={handleChange}
                                />
                                <span>Married</span>
                            </label>
                        </div>
                    </div>

                    {/* Spouse's Name (conditional) */}
                    {form.maritalStatus === 'married' && (
                        <div>
                            <label style={{ color: '#3D4B9C', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Spouse's Name <span style={{ color: 'red' }}>*</span></label>
                            <input
                                type="text"
                                name="spouseName"
                                value={form.spouseName}
                                onChange={handleChange}
                                placeholder="Spouse's Name"
                                required
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', background: '#fff', color: '#2c2c2c' }}
                            />
                        </div>
                    )}

                    {/* Province */}
                    <div>
                        <label style={{ color: '#3D4B9C', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Province <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="text"
                            name="province"
                            value={form.province}
                            onChange={handleChange}
                            placeholder="Province"
                            required
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', background: '#fff', color: '#2c2c2c' }}
                        />
                    </div>

                    {/* District */}
                    <div>
                        <label style={{ color: '#3D4B9C', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>District <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="text"
                            name="district"
                            value={form.district}
                            onChange={handleChange}
                            placeholder="District"
                            required
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', background: '#fff', color: '#2c2c2c' }}
                        />
                    </div>

                    {/* Rural Municipality */}
                    <div>
                        <label style={{ color: '#3D4B9C', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Rural Municipality <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="text"
                            name="ruralMunicipality"
                            value={form.ruralMunicipality}
                            onChange={handleChange}
                            placeholder="Rural Municipality"
                            required
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', background: '#fff', color: '#2c2c2c' }}
                        />
                    </div>

                    {/* Tole */}
                    <div>
                        <label style={{ color: '#3D4B9C', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Tole <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="text"
                            name="tole"
                            value={form.tole}
                            onChange={handleChange}
                            placeholder="Tole"
                            required
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', background: '#fff', color: '#2c2c2c' }}
                        />
                    </div>

                    {/* Ward Number */}
                    <div>
                        <label style={{ color: '#3D4B9C', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Ward Number <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="text"
                            name="wardNumber"
                            value={form.wardNumber}
                            onChange={handleChange}
                            placeholder="Ward Number"
                            required
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', background: '#fff', color: '#2c2c2c' }}
                        />
                    </div>

                    {/* Father's Name */}
                    <div>
                        <label style={{ color: '#3D4B9C', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Father's Name <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="text"
                            name="fatherName"
                            value={form.fatherName}
                            onChange={handleChange}
                            placeholder="Father's Name"
                            required
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', background: '#fff', color: '#2c2c2c' }}
                        />
                    </div>

                    {/* Mother's Name */}
                    <div>
                        <label style={{ color: '#3D4B9C', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Mother's Name <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="text"
                            name="motherName"
                            value={form.motherName}
                            onChange={handleChange}
                            placeholder="Mother's Name"
                            required
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', background: '#fff', color: '#2c2c2c' }}
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        style={{ background: '#3D4B9C', color: '#fff', padding: '1rem 2rem', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '1rem' }}
                    >
                        Submit
                    </button>
                </form>
            </div>
        </div>
    );
}