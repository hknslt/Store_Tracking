// src/pages/definitions/cushions/CushionsPage.tsx
import { useEffect, useState } from "react";
import { 
    getCushions, 
    addCushion, 
    updateCushion, 
    deleteCushion 
} from "../../../services/definitionService";
import type { Cushion } from "../../../types";
import "../../../App.css"; 
import "../Definitions.css"; // <-- Yeni CSS Dosyası

const CushionsPage = () => {
    const [cushions, setCushions] = useState<Cushion[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Cushion | null>(null);
    const [name, setName] = useState("");
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const showToast = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const data = await getCushions();
            data.sort((a, b) => a.cushionName.localeCompare(b.cushionName));
            setCushions(data);
        } catch (err) { showToast('error', "Veri hatası"); } 
        finally { setLoading(false); }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        try {
            if (editingItem && editingItem.id) {
                await updateCushion(editingItem.id, name);
                showToast('success', "Güncellendi");
            } else {
                await addCushion({ cushionName: name });
                showToast('success', "Eklendi");
            }
            await loadData();
            closeModal();
        } catch (err) { showToast('error', "İşlem başarısız"); }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Silmek istediğinize emin misiniz?")) {
            try {
                await deleteCushion(id);
                setCushions(prev => prev.filter(x => x.id !== id));
                showToast('success', "Silindi");
            } catch (err) { showToast('error', "Silinemedi"); }
        }
    };

    const openAdd = () => { setEditingItem(null); setName(""); setIsModalOpen(true); };
    const openEdit = (item: Cushion) => { setEditingItem(item); setName(item.cushionName); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditingItem(null); setName(""); };

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    return (
        <div className="page-container">
            {message && <div className={`toast-message ${message.type === 'success' ? 'toast-success' : 'toast-error'} toast-container`}>{message.text}</div>}
            
            <div className="page-header">
                <div className="page-title">
                    <h2>Minder Tipleri</h2>
                    <p>Toplam {cushions.length} kayıt</p>
                </div>
                <button onClick={openAdd} className="btn btn-primary">+ Yeni Minder</button>
            </div>

            <div className="definitions-grid">
                {cushions.map(item => (
                    <div key={item.id} className="definition-card">
                        <div className="card-content">
                            <div className="card-icon">🛋️</div>
                            <h4 className="card-title">{item.cushionName}</h4>
                        </div>
                        <div className="card-actions">
                            <button onClick={() => openEdit(item)} className="action-btn edit">Düzenle</button>
                            <button onClick={() => item.id && handleDelete(item.id)} className="action-btn delete">Sil</button>
                        </div>
                    </div>
                ))}
                {cushions.length === 0 && <div style={{color:'#999'}}>Kayıt yok.</div>}
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{width:'350px'}}>
                        <h3>{editingItem ? "Düzenle" : "Yeni Ekle"}</h3>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label className="form-label">Minder Adı</label>
                                <input type="text" className="form-input" value={name} onChange={e=>setName(e.target.value)} autoFocus required />
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
export default CushionsPage;