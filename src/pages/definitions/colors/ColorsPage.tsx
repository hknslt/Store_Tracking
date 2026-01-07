// src/pages/definitions/colors/ColorsPage.tsx
import { useEffect, useState } from "react";
import { getColors, addColor, updateColor, deleteColor } from "../../../services/definitionService";
import type { Color } from "../../../types";
import "../../../App.css";
import "../Definitions.css"; // <-- Yeni CSS

const ColorsPage = () => {
    // ... (State ve Fonksiyonlar aynı, sadece HTML değişecek)
    // Kısaltmak için sadece return kısmını ve gerekli state'leri yazıyorum
    // useAuth vb. yoksa direkt state'leri kopyala
    const [colors, setColors] = useState<Color[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingColor, setEditingColor] = useState<Color | null>(null);
    const [colorName, setColorName] = useState("");
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const showToast = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    useEffect(() => {
        getColors().then(data => {
            data.sort((a, b) => a.colorName.localeCompare(b.colorName));
            setColors(data);
            setLoading(false);
        });
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!colorName.trim()) return;
        try {
            if (editingColor && editingColor.id) {
                await updateColor(editingColor.id, colorName);
                showToast('success', "Güncellendi");
            } else {
                await addColor({ colorName });
                showToast('success', "Eklendi");
            }
            const data = await getColors();
            setColors(data.sort((a, b) => a.colorName.localeCompare(b.colorName)));
            closeModal();
        } catch { showToast('error', "Hata"); }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Silinsin mi?")) {
            await deleteColor(id);
            setColors(prev => prev.filter(c => c.id !== id));
            showToast('success', "Silindi");
        }
    };

    const openAdd = () => { setEditingColor(null); setColorName(""); setIsModalOpen(true); };
    const openEdit = (c: Color) => { setEditingColor(c); setColorName(c.colorName); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditingColor(null); setColorName(""); };

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    return (
        <div className="page-container">
            {message && <div className={`toast-message ${message.type === 'success' ? 'toast-success' : 'toast-error'} toast-container`}>{message.text}</div>}

            <div className="page-header">
                <div className="page-title">
                    <h2>Renk Tanımları</h2>
                    <p>Toplam {colors.length} renk</p>
                </div>
                <button onClick={openAdd} className="btn btn-primary">+ Yeni Renk</button>
            </div>

            <div className="definitions-grid">
                {colors.map(c => (
                    <div key={c.id} className="definition-card">
                        <div className="card-content">
                            <div className="card-icon" style={{ backgroundColor: '#ecf0f1' }}>🎨</div>
                            <h4 className="card-title">{c.colorName}</h4>
                        </div>
                        <div className="card-actions">
                            <button onClick={() => openEdit(c)} className="action-btn edit">Düzenle</button>
                            <button onClick={() => c.id && handleDelete(c.id)} className="action-btn delete">Sil</button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ width: '350px' }}>
                        <h3>{editingColor ? "Düzenle" : "Yeni Ekle"}</h3>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label className="form-label">Renk Adı</label>
                                <input type="text" className="form-input" value={colorName} onChange={e => setColorName(e.target.value)} autoFocus required />
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={closeModal} className="btn btn-secondary">İptal</button>
                                <button type="submit" className="btn btn-success">Kaydet</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
export default ColorsPage;