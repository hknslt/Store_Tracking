// src/pages/personnel/PersonnelAdd.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { getStores } from "../../services/storeService";
import { useAuth } from "../../context/AuthContext";
import { motion } from "framer-motion";
import type { Store } from "../../types";

const PersonnelAdd = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // --- STATE ---
    const [stores, setStores] = useState<Store[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [userStoreId, setUserStoreId] = useState("");

    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Form Verileri
    const [formData, setFormData] = useState({
        fullName: "",
        storeId: "",
        role: "staff",
        isActive: true,
        startDate: new Date().toISOString().split('T')[0],
        phone: "",
        address: ""
    });

    // --- INITIAL DATA ---
    useEffect(() => {
        const init = async () => {
            try {
                const sData = await getStores();
                setStores(sData);

                if (currentUser) {
                    const userDoc = await getDoc(doc(db, "personnel", currentUser.uid));
                    if (userDoc.exists()) {
                        const uData = userDoc.data();

                        if (uData.role === 'admin' || uData.role === 'control') {
                            setIsAdmin(true);
                        } else if (uData.role === 'store_admin') {
                            setIsAdmin(false);
                            setUserStoreId(uData.storeId);
                            setFormData(prev => ({ ...prev, storeId: uData.storeId }));
                        }
                    }
                }
            } catch (error) {
                console.error("Veri çekme hatası:", error);
            }
        };
        init();
    }, [currentUser]);

    // --- HANDLERS ---
    const handleChange = (e: any) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setNotification(null);

        if (!formData.fullName) {
            setNotification({ type: 'error', text: "Lütfen personel adını giriniz." });
            return;
        }
        if (!formData.storeId) {
            setNotification({ type: 'error', text: "Lütfen bir mağaza seçiniz." });
            return;
        }

        try {
            setLoading(true);

            // Veritabanına Ekle
            await addDoc(collection(db, "personnel"), {
                ...formData,
                role: 'staff',
                createdAt: new Date().toISOString()
            });

            setNotification({ type: 'success', text: "✅ Personel başarıyla kaydedildi!" });

            // Formu Temizle (Store ID admin değilse sabit kalır)
            setFormData(prev => ({
                ...prev,
                fullName: "",
                phone: "",
                address: "",
                storeId: isAdmin ? "" : userStoreId
            }));

            // 3 Saniye sonra mesajı kaldır
            setTimeout(() => setNotification(null), 3000);

        } catch (err: any) {
            console.error(err);
            setNotification({ type: 'error', text: "Hata oluştu: " + err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">

            {/* --- HEADER --- */}
            <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 className="page-title">Yeni Personel Ekle</h2>
                    <p className="page-subtitle">Satış ve puantaj işlemleri için personel tanımlayın.</p>
                </div>
                <button
                    onClick={() => navigate('/personnel')}
                    style={{
                        background: 'white',
                        border: '1px solid #cbd5e1',
                        padding: '10px 20px',
                        borderRadius: '10px',
                        color: '#64748b',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#1e293b'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#64748b'; }}
                >
                    İptal / Geri Dön
                </button>
            </div>

            {/* --- BİLDİRİM --- */}
            {notification && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        padding: '15px',
                        marginBottom: '20px',
                        borderRadius: '10px',
                        backgroundColor: notification.type === 'success' ? '#dcfce7' : '#fee2e2',
                        color: notification.type === 'success' ? '#166534' : '#991b1b',
                        border: `1px solid ${notification.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        maxWidth: '800px'
                    }}
                >
                    <span>{notification.type === 'success' ? '🎉' : '⚠️'}</span>
                    {notification.text}
                </motion.div>
            )}

            {/* --- FORM KARTI --- */}
            <div className="card" style={{ maxWidth: '800px' }}>
                <form onSubmit={handleSave} style={{ padding: '10px' }}>

                    {/* Bilgi Notu */}
                    <div style={{
                        backgroundColor: '#f8fafc',
                        borderLeft: '4px solid #3b82f6',
                        padding: '12px',
                        fontSize: '13px',
                        color: '#475569',
                        marginBottom: '20px',
                        borderRadius: '4px'
                    }}>
                        ℹ️ <b>Bilgi:</b> Buradan eklenen personeller sisteme <u>giriş yapamazlar</u>. Sadece satış, kasa ve puantaj işlemlerinde isimleri görünür.
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

                        {/* SOL SÜTUN */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                            {/* İsim */}
                            <div className="form-group">
                                <label style={labelStyle}>Adı Soyadı <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    style={inputStyle}
                                
                                    required
                                />
                            </div>

                            {/* Telefon */}
                            <div className="form-group">
                                <label style={labelStyle}>Telefon</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    style={inputStyle}
                                    placeholder="0 (5__) ___ __ __"
                                />
                            </div>

                            {/* Tarih */}
                            <div className="form-group">
                                <label style={labelStyle}>İşe Başlama Tarihi</label>
                                <input
                                    type="date"
                                    name="startDate"
                                    value={formData.startDate}
                                    onChange={handleChange}
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        {/* SAĞ SÜTUN */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                            {/* Mağaza Seçimi */}
                            <div className="form-group">
                                <label style={labelStyle}>Çalışacağı Mağaza <span style={{ color: 'red' }}>*</span></label>
                                {isAdmin ? (
                                    <select name="storeId" value={formData.storeId} onChange={handleChange} style={inputStyle} required>
                                        <option value="">-- Seçiniz --</option>
                                        {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={stores.find(s => s.id === userStoreId)?.storeName || "Mağazam"}
                                        disabled
                                        style={{ ...inputStyle, backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
                                    />
                                )}
                            </div>

                            {/* Durum (Aktif/Pasif) */}
                            <div className="form-group" style={{ marginTop: 'auto', padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0 }}>
                                    <input
                                        type="checkbox"
                                        name="isActive"
                                        checked={formData.isActive}
                                        onChange={handleChange}
                                        style={{ width: '20px', height: '20px', accentColor: '#145a32' }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: '600', color: '#334155', fontSize: '14px' }}>Aktif Çalışan</div>
                                        
                                    </div>
                                </label>
                            </div>
                        </div>

                    </div>

                    {/* Tam Genişlik Alan: Adres */}
                    <div className="form-group" style={{ marginBottom: '25px' }}>
                        <label style={labelStyle}>Adres</label>
                        <textarea
                            name="address"
                            rows={3}
                            value={formData.address}
                            onChange={handleChange}
                            style={{ ...inputStyle, resize: 'vertical' }}
                            placeholder="Personel adres bilgisi..."
                        />
                    </div>

                    <div style={{ height: '1px', background: '#e2e8f0', margin: '20px 0' }}></div>

                    {/* Buton */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                backgroundColor: '#10b981',
                                color: 'white',
                                padding: '12px 35px',
                                borderRadius: '10px',
                                border: 'none',
                                fontSize: '15px',
                                fontWeight: '600',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1,
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)' }}
                            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(0)' }}
                        >
                            {loading ? 'Kaydediliyor...' : 'Personeli Kaydet'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

// --- STYLES ---
const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#334155',
    fontSize: '14px'
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 15px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    color: '#1e293b',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    outline: 'none',
    backgroundColor: '#fff'
};

export default PersonnelAdd;