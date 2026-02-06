// src/pages/stores/StoreEdit.tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getStoreById, updateStore, deleteStore } from "../../services/storeService";
import { motion } from "framer-motion";
import { iller } from "../../constants/cities"; // 🔥 Şehir verisi import edildi

const StoreEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const [formData, setFormData] = useState({
        storeName: "",
        storeCode: "",
        phone: "",
        city: "",
        district: "",
        address: ""
    });

    // Seçili ilin ilçelerini getir
    const ilceler = formData.city
        ? iller.find(il => il.isim === formData.city)?.ilceler || []
        : [];

    useEffect(() => {
        const load = async () => {
            if (!id) return;
            const data = await getStoreById(id);
            if (data) {
                setFormData({
                    storeName: data.storeName,
                    storeCode: data.storeCode || "",
                    phone: data.phone || "",
                    city: data.city || "",       // 🔥 Veritabanından gelen İl
                    district: data.district || "", // 🔥 Veritabanından gelen İlçe
                    address: data.address || ""
                });
            } else {
                alert("Mağaza bulunamadı!");
                navigate('/stores');
            }
            setLoading(false);
        };
        load();
    }, [id, navigate]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;

        try {
            setLoading(true);
            await updateStore(id, formData);
            setMessage({ type: 'success', text: "✅ Mağaza güncellendi!" });
            setTimeout(() => navigate('/stores'), 1500);
        } catch (error) {
            setMessage({ type: 'error', text: "Hata oluştu." });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!id) return;
        try {
            await deleteStore(id);
            navigate('/stores');
        } catch (error) {
            alert("Silinemedi!");
        }
    };

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    return (
        <div className="page-container">

            {/* Silme Modalı */}
            {showDeleteModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '350px', textAlign: 'center' }}>
                        <h3>🗑️ Mağazayı Sil?</h3>
                        <p style={{ color: '#666' }}>Bu işlem geri alınamaz. Mağazaya bağlı veriler kaybolabilir.</p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                            <button onClick={() => setShowDeleteModal(false)} className="btn btn-secondary">Vazgeç</button>
                            <button onClick={handleDelete} className="btn btn-danger">Evet, Sil</button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 className="page-title">Mağaza Düzenle</h2>
                    <p className="page-subtitle">Mağaza bilgilerini güncelle veya sil</p>
                </div>
                <button onClick={() => navigate('/stores')} className="btn btn-secondary">İptal</button>
            </div>

            {message && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '15px', marginBottom: '20px', borderRadius: '10px', backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2', color: message.type === 'success' ? '#166534' : '#991b1b', border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
                    {message.text}
                </motion.div>
            )}

            <div className="card" style={{ maxWidth: '800px' }}>
                <form onSubmit={handleSave} style={{ padding: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

                        {/* Sol Sütun */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="form-group">
                                <label style={labelStyle}>Mağaza Adı</label>
                                <input type="text" value={formData.storeName} onChange={e => setFormData({ ...formData, storeName: e.target.value })} style={inputStyle} required />
                            </div>
                            <div className="form-group">
                                <label style={labelStyle}>Şube Kodu</label>
                                <input type="text" value={formData.storeCode} onChange={e => setFormData({ ...formData, storeCode: e.target.value })} style={inputStyle} />
                            </div>
                            <div className="form-group">
                                <label style={labelStyle}>Telefon</label>
                                <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} style={inputStyle} />
                            </div>
                        </div>

                        {/* Sağ Sütun: İl/İlçe Seçimi */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                            <div className="form-group">
                                <label style={labelStyle}>İl</label>
                                <select
                                    value={formData.city}
                                    onChange={e => setFormData({ ...formData, city: e.target.value, district: "" })}
                                    style={inputStyle}
                                >
                                    <option value="">-- İl Seçiniz --</option>
                                    {iller.map(il => (
                                        <option key={il.id} value={il.isim}>{il.isim}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label style={labelStyle}>İlçe</label>
                                <select
                                    value={formData.district}
                                    onChange={e => setFormData({ ...formData, district: e.target.value })}
                                    style={inputStyle}
                                    disabled={!formData.city}
                                >
                                    <option value="">-- İlçe Seçiniz --</option>
                                    {ilceler.map((ilce, index) => (
                                        <option key={index} value={ilce}>{ilce}</option>
                                    ))}
                                </select>
                            </div>

                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '25px' }}>
                        <label style={labelStyle}>Açık Adres</label>
                        <textarea rows={4} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} />
                    </div>

                    <div style={{ height: '1px', background: '#e2e8f0', margin: '20px 0' }}></div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button type="button" onClick={() => setShowDeleteModal(true)} className="btn btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            🗑️ Mağazayı Sil
                        </button>
                        <button type="submit" disabled={loading} className="btn btn-primary">
                            {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155', fontSize: '14px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b', outline: 'none', backgroundColor: '#f8fafc' };

export default StoreEdit;