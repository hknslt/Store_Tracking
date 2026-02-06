// src/pages/personnel/PersonnelEdit.tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { getStores, updatePersonnel } from "../../services/storeService"; // Servisi import et
import { useAuth } from "../../context/AuthContext";
import { motion } from "framer-motion";
import type { Store } from "../../types";

const PersonnelEdit = () => {
    const { id } = useParams();
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [formData, setFormData] = useState({
        fullName: "",
        storeId: "",
        phone: "",
        address: "",
        isActive: true,
        startDate: ""
    });

    useEffect(() => {
        const init = async () => {
            if (!id) return;
            try {
                // 1. Mağazaları Çek
                const sData = await getStores();
                setStores(sData);

                // 2. Personel Verisini Çek
                const docRef = doc(db, "personnel", id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setFormData({
                        fullName: data.fullName || "",
                        storeId: data.storeId || "",
                        phone: data.phone || "",
                        address: data.address || "",
                        isActive: data.isActive ?? true,
                        startDate: data.startDate || ""
                    });
                } else {
                    alert("Personel bulunamadı!");
                    navigate("/personnel");
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [id, navigate]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;
        setNotification(null);

        try {
            setLoading(true);
            await updatePersonnel(id, formData);
            setNotification({ type: 'success', text: "✅ Bilgiler güncellendi!" });

            // Biraz bekleyip detay sayfasına dön
            setTimeout(() => navigate(`/personnel/${id}`), 1500);
        } catch (err: any) {
            setNotification({ type: 'error', text: "Hata: " + err.message });
            setLoading(false);
        }
    };

    const handleChange = (e: any) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    // Ortak Stil
    const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155', fontSize: '14px' };
    const inputStyle = { width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', backgroundColor: '#fff' };

    return (
        <div className="page-container">
            <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 className="page-title">Personeli Düzenle</h2>
                    <p className="page-subtitle">Mevcut bilgileri güncelle</p>
                </div>
                <button onClick={() => navigate(-1)} className="modern-btn btn-secondary">İptal</button>
            </div>

            {notification && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '15px', marginBottom: '20px', borderRadius: '10px', backgroundColor: notification.type === 'success' ? '#dcfce7' : '#fee2e2', color: notification.type === 'success' ? '#166534' : '#991b1b', border: `1px solid ${notification.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
                    {notification.text}
                </motion.div>
            )}

            <div className="card" style={{ maxWidth: '800px' }}>
                <form onSubmit={handleSave} style={{ padding: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="form-group">
                                <label style={labelStyle}>Adı Soyadı</label>
                                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} style={inputStyle} required />
                            </div>
                            <div className="form-group">
                                <label style={labelStyle}>Telefon</label>
                                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} style={inputStyle} />
                            </div>
                            <div className="form-group">
                                <label style={labelStyle}>Giriş Tarihi</label>
                                <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} style={inputStyle} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="form-group">
                                <label style={labelStyle}>Mağaza</label>
                                <select name="storeId" value={formData.storeId} onChange={handleChange} style={inputStyle} required>
                                    <option value="">Seçiniz</option>
                                    {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                                </select>
                            </div>
                            {/* Durum Checkbox */}
                            <div className="form-group" style={{ marginTop: 'auto', padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0 }}>
                                    <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} style={{ width: '20px', height: '20px', accentColor: '#145a32' }} />
                                    <div>
                                        <div style={{ fontWeight: '600', color: '#334155', fontSize: '14px' }}>Aktif Çalışan</div>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>İşten ayrıldıysa işareti kaldırın.</div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '25px' }}>
                        <label style={labelStyle}>Adres</label>
                        <textarea name="address" rows={3} value={formData.address} onChange={handleChange} style={{ ...inputStyle, resize: 'vertical' }} />
                    </div>

                    <div style={{ height: '1px', background: '#e2e8f0', margin: '20px 0' }}></div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" disabled={loading} className="modern-btn btn-primary" style={{ padding: '12px 35px' }}>
                            {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PersonnelEdit;