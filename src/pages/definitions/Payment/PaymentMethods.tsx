import { useState, useEffect } from "react";
import {
    addPaymentMethod,
    getPaymentMethods,
    updatePaymentMethod,
    deletePaymentMethod
} from "../../../services/paymentService";
import type { PaymentMethod } from "../../../types";
import "../../../App.css";
import "../Definitions.css";

// İkonlar
import EditIcon from "../../../assets/icons/edit.svg";
import TrashIcon from "../../../assets/icons/trash.svg";

const PaymentMethods = () => {
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<PaymentMethod | null>(null);
    const [name, setName] = useState("");
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Onay Modalı State
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
            const data = await getPaymentMethods();
            data.sort((a, b) => a.name.localeCompare(b.name));
            setMethods(data);
        } catch (e) { setMessage({ type: 'error', text: 'Veri hatası' }); }
        finally { setLoading(false); }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        try {
            if (editingItem && editingItem.id) {
                await updatePaymentMethod(editingItem.id, name);
                setMessage({ type: 'success', text: 'Güncellendi' });
            } else {
                await addPaymentMethod(name);
                setMessage({ type: 'success', text: 'Eklendi' });
            }
            await loadData();
            closeModal();
        } catch { setMessage({ type: 'error', text: 'İşlem başarısız' }); }
    };

    // Silme işlemini başlatan fonksiyon (Modal açar)
    const requestDelete = (id: string) => {
        setConfirmModal({ show: true, id });
    };

    // Silme işlemini onaylayan fonksiyon (Gerçek silme)
    const confirmDelete = async () => {
        if (!confirmModal.id) return;
        try {
            await deletePaymentMethod(confirmModal.id);
            setMethods(prev => prev.filter(m => m.id !== confirmModal.id));
            setMessage({ type: 'success', text: 'Silindi' });
        } catch { setMessage({ type: 'error', text: 'Silinemedi' }); }
        finally { setConfirmModal({ show: false, id: null }); }
    };

    const openAdd = () => { setEditingItem(null); setName(""); setIsModalOpen(true); };
    const openEdit = (item: PaymentMethod) => { setEditingItem(item); setName(item.name); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditingItem(null); setName(""); };

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    return (
        <div className="page-container">
            {message && <div className={`toast-message ${message.type === 'success' ? 'toast-success' : 'toast-error'}`}>{message.text}</div>}

            {/* ONAY MODALI */}
            {confirmModal.show && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ width: '300px', textAlign: 'center' }}>
                        <div style={{ fontSize: '40px', marginBottom: '10px' }}>⚠️</div>
                        <h3 style={{ margin: '0 0 10px 0' }}>Emin misiniz?</h3>
                        <p style={{ color: '#666', fontSize: '14px' }}>Bu kayıt kalıcı olarak silinecek.</p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
                            <button onClick={() => setConfirmModal({ show: false, id: null })} className="btn btn-secondary">Vazgeç</button>
                            <button onClick={confirmDelete} className="btn btn-danger">Evet, Sil</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="page-header">
                <div className="page-title">
                    <h2>Ödeme Yöntemleri</h2>
                    <p>Kasa ve tahsilat tipleri</p>
                </div>
                <button onClick={openAdd} className="btn btn-primary">+ Yeni Yöntem</button>
            </div>

            <div className="definitions-grid">
                {methods.map(m => (
                    <div key={m.id} className="definition-card card-type-payment">
                        <div className="card-content">
                            <span className="card-title">{m.name}</span>
                        </div>
                        <div className="card-actions">
                            <button onClick={() => openEdit(m)} className="action-btn" title="Düzenle">
                                <img src={EditIcon} style={{ filter: 'invert(35%) sepia(93%) saturate(368%) hue-rotate(173deg)' }} />
                            </button>
                            <button onClick={() => m.id && requestDelete(m.id)} className="action-btn" title="Sil">
                                <img src={TrashIcon} style={{ filter: 'invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg)' }} />
                            </button>
                        </div>
                    </div>
                ))}
                {methods.length === 0 && <div style={{ color: '#999', fontStyle: 'italic' }}>Kayıt yok.</div>}
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{editingItem ? "Yöntemi Düzenle" : "Yeni Ödeme Yöntemi"}</h3>
                            <button onClick={closeModal} className="close-btn">×</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label>Yöntem Adı</label>
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

export default PaymentMethods;