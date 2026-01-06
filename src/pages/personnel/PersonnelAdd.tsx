// src/pages/personnel/PersonnelAdd.tsx
import { useState, useEffect } from "react";
import { createStaffUser, getStores } from "../../services/storeService"; // 👈 createStaffUser import edildi
import type { Personnel, Store } from "../../types";

const PersonnelAdd = () => {
    const [stores, setStores] = useState<Store[]>([]);
    const [message, setMessage] = useState("");
    const [error, setError] = useState(""); // Hata mesajı için

    // Form verisine email ve password ekledik
    const [formData, setFormData] = useState({
        fullName: "",
        storeId: "",
        role: "staff",
        isActive: true,
        startDate: new Date().toISOString().split('T')[0],
        phone: "",
        address: "",
        email: "",    // 👈 YENİ
        password: ""  // 👈 YENİ
    });

    useEffect(() => {
        getStores().then(setStores);
    }, []);

    const handleChange = (e: any) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setMessage("");

        // Basit validasyon
        if (!formData.fullName || !formData.storeId || !formData.email || !formData.password) {
            return setError("İsim, Mağaza, E-posta ve Şifre zorunludur!");
        }

        if (formData.password.length < 6) {
            return setError("Şifre en az 6 karakter olmalıdır.");
        }

        try {
            // Servis fonksiyonunu çağır (Password'ü ayrıca gönderiyoruz)
            // formData'yı Personnel tipine uygun hale getirip gönderiyoruz
            const personnelData: Personnel = {
                fullName: formData.fullName,
                storeId: formData.storeId,
                role: formData.role as any,
                isActive: formData.isActive,
                startDate: formData.startDate,
                phone: formData.phone,
                address: formData.address,
                email: formData.email
            };

            await createStaffUser(personnelData, formData.password);

            setMessage("✅ Personel ve Giriş Hesabı Oluşturuldu!");

            // Formu temizle
            setFormData(prev => ({
                ...prev,
                fullName: "",
                phone: "",
                address: "",
                email: "",
                password: ""
            }));

            setTimeout(() => setMessage(""), 3000);
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError("Bu e-posta adresi zaten kullanımda!");
            } else {
                setError("Hata oluştu: " + err.message);
            }
        }
    };

    return (
        <div style={{ maxWidth: '700px' }}>
            <h2>Yeni Personel Girişi</h2>

            {message && <div style={successStyle}>{message}</div>}
            {error && <div style={errorStyle}>{error}</div>}

            <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                {/* --- HESAP BİLGİLERİ (YENİ) --- */}
                <div style={{ gridColumn: 'span 2', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px' }}>
                    <h4 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>Giriş Bilgileri</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label style={labelStyle}>E-Posta (Giriş İçin)</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} style={inputStyle} placeholder="ornek@flexy.com" required />
                        </div>
                        <div>
                            <label style={labelStyle}>Şifre</label>
                            <input type="password" name="password" value={formData.password} onChange={handleChange} style={inputStyle} placeholder="******" required />
                        </div>
                    </div>
                </div>

                {/* MAĞAZA SEÇİMİ */}
                <div style={{ gridColumn: 'span 2' }}>
                    <label style={labelStyle}>Bağlı Olduğu Mağaza</label>
                    <select name="storeId" value={formData.storeId} onChange={handleChange} style={inputStyle}>
                        <option value="">-- Mağaza Seçiniz --</option>
                        {stores.map(s => <option key={s.id} value={s.id}>{s.storeName} ({s.storeCode})</option>)}
                    </select>
                </div>

                <div>
                    <label style={labelStyle}>Adı Soyadı</label>
                    <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} style={inputStyle} />
                </div>

                <div>
                    <label style={labelStyle}>Görevi / Yetkisi</label>
                    <select name="role" value={formData.role} onChange={handleChange} style={inputStyle}>
                        <option value="staff">Personel (Satış Danışmanı)</option>
                        <option value="store_admin">Mağaza Admini (Müdür)</option>
                        {/* ⚠️ ADMIN ROLÜ KALDIRILDI */}
                    </select>
                </div>

                <div>
                    <label style={labelStyle}>İşe Başlama Tarihi</label>
                    <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} style={inputStyle} />
                </div>

                <div>
                    <label style={labelStyle}>Telefon</label>
                    <input type="text" name="phone" value={formData.phone} onChange={handleChange} style={inputStyle} />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                    <label style={labelStyle}>Adres</label>
                    <textarea name="address" rows={2} value={formData.address} onChange={handleChange} style={inputStyle} />
                </div>

                {/* Aktiflik Durumu */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} style={{ width: '20px', height: '20px' }} />
                    <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Aktif Çalışan</label>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                    <button type="submit" style={btnStyle}>Personeli Kaydet</button>
                </div>
            </form>
        </div>
    );
};

// Stiller
const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px', color: '#555' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' };
const btnStyle = { width: '100%', padding: '12px', backgroundColor: '#2980b9', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' };
const successStyle = { padding: '10px', backgroundColor: '#d4edda', color: '#155724', marginBottom: '10px', borderRadius: '5px' };
const errorStyle = { padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', marginBottom: '10px', borderRadius: '5px' };

export default PersonnelAdd;