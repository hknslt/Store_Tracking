import { useEffect, useState } from "react";
import { getCushions, addCushion, updateCushion, deleteCushion } from "../../../services/definitionService";
import type { Cushion } from "../../../types";
import "../../../App.css";
import "../Definitions.css";

import EditIcon from "../../../assets/icons/edit.svg";
import TrashIcon from "../../../assets/icons/trash.svg";

const CushionsPage = () => {
    const [cushions, setCushions] = useState<Cushion[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Cushion | null>(null);
    const [name, setName] = useState("");
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Onay Modalı
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
            const data = await getCushions();
            data.sort((a, b) => a.cushionName.localeCompare(b.cushionName));
            setCushions(data);
        } catch (err) { setMessage({ type: 'error', text: 'Veri hatası' }); }
        finally { setLoading(false); }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        try {
            if (editingItem && editingItem.id) {
                await updateCushion(editingItem.id, name);
                setMessage({ type: 'success', text: 'Güncellendi' });
            } else {
                await addCushion({ cushionName: name });
                setMessage({ type: 'success', text: 'Eklendi' });
            }
            await loadData();
            closeModal();
        } catch (err) { setMessage({ type: 'error', text: 'İşlem başarısız' }); }
    };

    const requestDelete = (id: string) => { setConfirmModal({ show: true, id }); };

    const confirmDelete = async () => {
        if (!confirmModal.id) return;
        try {
            await deleteCushion(confirmModal.id);
            setCushions(prev => prev.filter(x => x.id !== confirmModal.id));
            setMessage({ type: 'success', text: 'Silindi' });
        } catch (err) { setMessage({ type: 'error', text: 'Silinemedi' }); }
        finally { setConfirmModal({ show: false, id: null }); }
    };

    const openAdd = () => { setEditingItem(null); setName(""); setIsModalOpen(true); };
    const openEdit = (item: Cushion) => { setEditingItem(item); setName(item.cushionName); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditingItem(null); setName(""); };

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
                    <h2>Minder Tipleri</h2>
                    <p>Koltuk ve sandalye minder seçenekleri</p>
                </div>
                <button onClick={openAdd} className="btn btn-primary">+ Yeni Minder</button>
            </div>

            <div className="definitions-grid">
                {cushions.map(item => (
                    <div key={item.id} className="definition-card card-type-cushion">
                        <div className="card-content">
                            <span className="card-title">{item.cushionName}</span>
                        </div>
                        <div className="card-actions">
                            <button onClick={() => openEdit(item)} className="action-btn" title="Düzenle">
                                <img src={EditIcon} style={{ filter: 'invert(52%) sepia(82%) saturate(347%) hue-rotate(63deg)' }} />
                            </button>
                            <button onClick={() => item.id && requestDelete(item.id)} className="action-btn" title="Sil">
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
                            <h3>{editingItem ? "Düzenle" : "Yeni Ekle"}</h3>
                            <button onClick={closeModal} className="close-btn">×</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label>Minder Adı</label>
                                <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} autoFocus required />
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
export default CushionsPage;