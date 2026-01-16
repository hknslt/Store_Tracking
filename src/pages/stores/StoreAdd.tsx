// src/pages/stores/StoreAdd.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addStore } from "../../services/storeService";
import { motion } from "framer-motion";

// İKONLAR (Mevcut assets klasöründen veya emoji)
// Eğer elinde 'save.svg' veya 'back.svg' varsa onları import edebilirsin.
// Şimdilik emoji ve CSS ile şıklaştıracağız.

const StoreAdd = () => {
    const navigate = useNavigate();

    // Form State
    const [formData, setFormData] = useState({
        storeName: "",
        storeCode: "",
        address: "",
        phone: ""
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
            setFormData({ storeName: "", storeCode: "", address: "", phone: "" });

            // 2 Saniye sonra listeye dön (Opsiyonel)
            // setTimeout(() => navigate('/stores'), 2000); 

        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: "Bir hata oluştu." });
        } finally {
            setLoading(false);
            // Mesajı 3 saniye sonra temizle
            setTimeout(() => setMessage(null), 3000);
        }
    };

    return (
        <div className="page-container">

            {/* --- BAŞLIK ALANI --- */}
            <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 className="page-title">Yeni Mağaza Ekle</h2>
                    <p className="page-subtitle">Sisteme yeni bir şube veya depo tanımlayın.</p>
                </div>
                <button
                    onClick={() => navigate('/stores')}
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

            {/* --- BİLDİRİM MESAJI --- */}
            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        padding: '15px',
                        marginBottom: '20px',
                        borderRadius: '10px',
                        backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
                        color: message.type === 'success' ? '#166534' : '#991b1b',
                        border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}
                >
                    <span>{message.type === 'success' ? '🎉' : '⚠️'}</span>
                    {message.text}
                </motion.div>
            )}

            {/* --- FORM KARTI --- */}
            <div className="card" style={{ maxWidth: '800px' }}> {/* Genişliği sınırladık */}
                <form onSubmit={handleSave} style={{ padding: '10px' }}>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

                        {/* Sol Sütun */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="form-group">
                                <label style={labelStyle}>Mağaza Adı <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="text"
                                    value={formData.storeName}
                                    onChange={e => setFormData({ ...formData, storeName: e.target.value })}
                                    style={inputStyle}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label style={labelStyle}>Şube Kodu / Kısaltma</label>
                                <input
                                    type="text"
                                    value={formData.storeCode}
                                    onChange={e => setFormData({ ...formData, storeCode: e.target.value })}
                                    style={inputStyle}
                                    placeholder="M-"
                                />
                            </div>
                        </div>

                        {/* Sağ Sütun */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="form-group">
                                <label style={labelStyle}>Telefon</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    style={inputStyle}
                                    placeholder="0 (___) ___ __ __"
                                />
                            </div>

                            {/* Adres Alanı (Daha geniş olması için aşağı taşıdık veya burada bırakabiliriz) */}
                            {/* Burada sağ sütunda duralım */}
                        </div>

                    </div>

                    {/* Tam Genişlik Alanlar */}
                    <div className="form-group" style={{ marginBottom: '25px' }}>
                        <label style={labelStyle}>Açık Adres</label>
                        <textarea
                            rows={4}
                            value={formData.address}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                            style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
                            placeholder="Mahalle, Cadde, Sokak ve No bilgileri..."
                        />
                    </div>

                    <div style={{ height: '1px', background: '#e2e8f0', margin: '20px 0' }}></div>

                    {/* Buton Alanı */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                backgroundColor: '#10b981', // Yeşil Tema
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
                            {loading ? 'Kaydediliyor...' : '💾 Kaydet ve Tamamla'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

// --- CSS STYLES (Inline) ---
const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#334155', // Slate-700
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
    backgroundColor: '#f8fafc'
};

// Basit bir focus efekti için CSS class'ı App.css'e eklenebilir veya 
// onFocus eventleri ile yönetilebilir. Ancak yukarıdaki style modern duracaktır.

export default StoreAdd;