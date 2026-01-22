import { useEffect, useState } from "react";
import { getColors, addColor, updateColor, deleteColor } from "../../../services/definitionService";
import type { Color } from "../../../types";
import "../../../App.css";
import "../Definitions.css";

import EditIcon from "../../../assets/icons/edit.svg";
import TrashIcon from "../../../assets/icons/trash.svg";

const ColorsPage = () => {
    const [colors, setColors] = useState<Color[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingColor, setEditingColor] = useState<Color | null>(null);
    const [colorName, setColorName] = useState("");
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [confirmModal, setConfirmModal] = useState<{ show: boolean, id: string | null }>({ show: false, id: null });

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const data = await getColors();
            data.sort((a, b) => a.colorName.localeCompare(b.colorName));
            setColors(data);
        } catch (err) { setMessage({ type: 'error', text: 'Veri yüklenemedi' }); }
        finally { setLoading(false); }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!colorName.trim()) return;
        try {
            if (editingColor && editingColor.id) {
                await updateColor(editingColor.id, colorName);
                setMessage({ type: 'success', text: 'Renk güncellendi' });
            } else {
                await addColor({ colorName });
                setMessage({ type: 'success', text: 'Renk eklendi' });
            }
            await loadData();
            closeModal();
        } catch { setMessage({ type: 'error', text: 'İşlem başarısız' }); }
    };

    const requestDelete = (id: string) => { setConfirmModal({ show: true, id }); };

    const confirmDelete = async () => {
        if (!confirmModal.id) return;
        try {
            await deleteColor(confirmModal.id);
            setColors(prev => prev.filter(c => c.id !== confirmModal.id));
            setMessage({ type: 'success', text: 'Renk silindi' });
        } catch { setMessage({ type: 'error', text: 'Silinemedi' }); }
        finally { setConfirmModal({ show: false, id: null }); }
    };

    const openAdd = () => { setEditingColor(null); setColorName(""); setIsModalOpen(true); };
    const openEdit = (c: Color) => { setEditingColor(c); setColorName(c.colorName); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditingColor(null); setColorName(""); };

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    return (
        <div className="page-container">
            {message && <div className={`toast-message ${message.type === 'success' ? 'toast-success' : 'toast-error'}`}>{message.text}</div>}

            {confirmModal.show && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ width: '300px', textAlign: 'center' }}>
                        <div style={{ fontSize: '40px', marginBottom: '10px' }}>⚠️</div>
                        <h3 style={{ margin: '0 0 10px 0' }}>Emin misiniz?</h3>
                        <p style={{ color: '#666', fontSize: '14px' }}>Kayıt silinecek.</p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
                            <button onClick={() => setConfirmModal({ show: false, id: null })} className="btn btn-secondary">Vazgeç</button>
                            <button onClick={confirmDelete} className="btn btn-danger">Evet, Sil</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="page-header">
                <div className="page-title">
                    <h2>Renk Tanımları</h2>
                    <p>Sistemdeki mevcut renk seçenekleri</p>
                </div>
                <button onClick={openAdd} className="btn btn-primary">+ Yeni Renk</button>
            </div>

            <div className="definitions-grid">
                {colors.map(c => (
                    <div key={c.id} className="definition-card card-type-color">
                        <div className="card-content">
                            <span className="card-title">{c.colorName}</span>
                        </div>
                        <div className="card-actions">
                            <button onClick={() => openEdit(c)} className="action-btn" title="Düzenle">
                                <img src={EditIcon} style={{ filter: 'invert(35%) sepia(93%) saturate(368%) hue-rotate(173deg)' }} />
                            </button>
                            <button onClick={() => c.id && requestDelete(c.id)} className="action-btn" title="Sil">
                                <img src={TrashIcon} style={{ filter: 'invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg)' }} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{editingColor ? "Rengi Düzenle" : "Yeni Renk Ekle"}</h3>
                            <button onClick={closeModal} className="close-btn">×</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label>Renk Adı</label>
                                <input type="text" className="form-input" value={colorName} onChange={e => setColorName(e.target.value)} autoFocus required />
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={closeModal} className="btn btn-secondary">İptal</button>
                                <button type="submit" className="btn btn-primary">Kaydet</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
export default ColorsPage;