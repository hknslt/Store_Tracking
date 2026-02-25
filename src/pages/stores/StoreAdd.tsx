// src/pages/stores/StoreAdd.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addStore } from "../../services/storeService";
import { motion } from "framer-motion";
import { iller } from "../../constants/cities"; //   Şehir verisi import edildi

const StoreAdd = () => {
    const navigate = useNavigate();

    // Form State
    const [formData, setFormData] = useState({
        storeName: "",
        storeCode: "",
        phone: "",
        city: "",
        district: "",
        address: ""
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Seçili ilin ilçelerini getir (Eğer il seçiliyse)
    const ilceler = formData.city
        ? iller.find(il => il.isim === formData.city)?.ilceler || []
        : [];

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.storeName) {
            setMessage({ type: 'error', text: "Lütfen Mağaza Adını giriniz." });
            return;
        }

        try {
            setLoading(true);
            await addStore(formData);

            setMessage({ type: 'success', text: "✅ Mağaza Başarıyla Oluşturuldu!" });
            setFormData({ storeName: "", storeCode: "", phone: "", city: "", district: "", address: "" });

        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: "Bir hata oluştu." });
        } finally {
            setLoading(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    return (
        <div className="page-container">

            <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 className="page-title">Yeni Mağaza Ekle</h2>
                    <p className="page-subtitle">Sisteme yeni bir şube veya depo tanımlayın.</p>
                </div>
                <button onClick={() => navigate('/stores')} className="btn btn-secondary">İptal / Geri Dön</button>
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
                                <label style={labelStyle}>Mağaza Adı <span style={{ color: 'red' }}>*</span></label>
                                <input type="text" value={formData.storeName} onChange={e => setFormData({ ...formData, storeName: e.target.value })} style={inputStyle} required />
                            </div>
                            <div className="form-group">
                                <label style={labelStyle}>Şube Kodu</label>
                                <input type="text" value={formData.storeCode} onChange={e => setFormData({ ...formData, storeCode: e.target.value })} style={inputStyle} placeholder="M-" />
                            </div>
                            <div className="form-group">
                                <label style={labelStyle}>Telefon</label>
                                <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} style={inputStyle} placeholder="0 (___) ___ __ __" />
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
                                    disabled={!formData.city} // İl seçilmeden pasif olur
                                >
                                    <option value="">-- İlçe Seçiniz --</option>
                                    {ilceler.map((ilce, index) => (
                                        <option key={index} value={ilce}>{ilce}</option>
                                    ))}
                                </select>
                            </div>

                        </div>
                    </div>

                    {/* Adres */}
                    <div className="form-group" style={{ marginBottom: '25px' }}>
                        <label style={labelStyle}>Açık Adres (Mahalle, Cadde, Sokak)</label>
                        <textarea rows={4} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }} placeholder="Detaylı adres bilgisi..." />
                    </div>

                    <div style={{ height: '1px', background: '#e2e8f0', margin: '20px 0' }}></div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '12px 35px' }}>
                            {loading ? 'Kaydediliyor...' : 'Kaydet ve Tamamla'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

// Styles
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155', fontSize: '14px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b', outline: 'none', backgroundColor: '#f8fafc' };

export default StoreAdd;