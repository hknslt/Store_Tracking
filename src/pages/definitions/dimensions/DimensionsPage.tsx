import { useEffect, useState } from "react";
import { getDimensions, addDimension, updateDimension, deleteDimension } from "../../../services/definitionService";
import type { Dimension } from "../../../types";
import "../../../App.css";
import "../Definitions.css";

import EditIcon from "../../../assets/icons/edit.svg";
import TrashIcon from "../../../assets/icons/trash.svg";

const DimensionsPage = () => {
    const [dimensions, setDimensions] = useState<Dimension[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDim, setEditingDim] = useState<Dimension | null>(null);
    const [dimName, setDimName] = useState("");
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
            const data = await getDimensions();
            data.sort((a, b) => a.dimensionName.localeCompare(b.dimensionName, undefined, { numeric: true }));
            setDimensions(data);
        } catch { setMessage({ type: 'error', text: 'Veri hatası' }); }
        finally { setLoading(false); }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dimName.trim()) return;
        try {
            if (editingDim && editingDim.id) {
                await updateDimension(editingDim.id, dimName);
                setMessage({ type: 'success', text: 'Ebat güncellendi' });
            } else {
                await addDimension({ dimensionName: dimName });
                setMessage({ type: 'success', text: 'Ebat eklendi' });
            }
            await loadData();
            closeModal();
        } catch { setMessage({ type: 'error', text: 'Hata oluştu' }); }
    };

    const requestDelete = (id: string) => { setConfirmModal({ show: true, id }); };

    const confirmDelete = async () => {
        if (!confirmModal.id) return;
        try {
            await deleteDimension(confirmModal.id);
            setDimensions(prev => prev.filter(d => d.id !== confirmModal.id));
            setMessage({ type: 'success', text: 'Silindi' });
        } catch { setMessage({ type: 'error', text: 'Silinemedi' }); }
        finally { setConfirmModal({ show: false, id: null }); }
    };

    const openAdd = () => { setEditingDim(null); setDimName(""); setIsModalOpen(true); };
    const openEdit = (d: Dimension) => { setEditingDim(d); setDimName(d.dimensionName); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditingDim(null); setDimName(""); };

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
                    <h2>Ebat Tanımları</h2>
                    <p>Ürün ölçüleri ve boyutları</p>
                </div>
                <button onClick={openAdd} className="btn btn-primary">+ Yeni Ebat</button>
            </div>

            <div className="definitions-grid">
                {dimensions.map(d => (
                    <div key={d.id} className="definition-card card-type-dimension">
                        <div className="card-content">
                            <span className="card-title">{d.dimensionName}</span>
                        </div>
                        <div className="card-actions">
                            <button onClick={() => openEdit(d)} className="action-btn" title="Düzenle">
                                <img src={EditIcon} style={{ filter: 'invert(68%) sepia(34%) saturate(5437%) hue-rotate(1deg) brightness(103%) contrast(105%)' }} />
                            </button>
                            <button onClick={() => d.id && requestDelete(d.id)} className="action-btn" title="Sil">
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
                            <h3>{editingDim ? "Ebat Düzenle" : "Yeni Ebat Ekle"}</h3>
                            <button onClick={closeModal} className="close-btn">×</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label>Ebat Adı</label>
                                <input type="text" className="form-input" value={dimName} onChange={e => setDimName(e.target.value)} autoFocus required />
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
export default DimensionsPage;