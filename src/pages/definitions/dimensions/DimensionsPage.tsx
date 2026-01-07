// src/pages/definitions/dimensions/DimensionsPage.tsx
import { useEffect, useState } from "react";
import { getDimensions, addDimension, updateDimension, deleteDimension } from "../../../services/definitionService";
import type { Dimension } from "../../../types";
import "../../../App.css"; 
import "../Definitions.css"; // <-- Yeni CSS

const DimensionsPage = () => {
    const [dimensions, setDimensions] = useState<Dimension[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDim, setEditingDim] = useState<Dimension | null>(null);
    const [dimName, setDimName] = useState("");
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const showToast = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    useEffect(() => {
        getDimensions().then(data => {
            data.sort((a, b) => a.dimensionName.localeCompare(b.dimensionName, undefined, { numeric: true }));
            setDimensions(data);
            setLoading(false);
        });
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dimName.trim()) return;
        try {
            if (editingDim && editingDim.id) {
                await updateDimension(editingDim.id, dimName);
                showToast('success', "Güncellendi");
            } else {
                await addDimension({ dimensionName: dimName });
                showToast('success', "Eklendi");
            }
            const data = await getDimensions();
            setDimensions(data.sort((a,b)=>a.dimensionName.localeCompare(b.dimensionName, undefined, {numeric:true})));
            closeModal();
        } catch { showToast('error', "Hata"); }
    };

    const handleDelete = async (id: string) => {
        if(window.confirm("Silinsin mi?")) {
            await deleteDimension(id);
            setDimensions(prev => prev.filter(d => d.id !== id));
            showToast('success', "Silindi");
        }
    };

    const openAdd = () => { setEditingDim(null); setDimName(""); setIsModalOpen(true); };
    const openEdit = (d: Dimension) => { setEditingDim(d); setDimName(d.dimensionName); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditingDim(null); setDimName(""); };

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    return (
        <div className="page-container">
            {message && <div className={`toast-message ${message.type === 'success' ? 'toast-success' : 'toast-error'} toast-container`}>{message.text}</div>}
            
            <div className="page-header">
                <div className="page-title">
                    <h2>Ebat Tanımları</h2>
                    <p>Toplam {dimensions.length} ebat</p>
                </div>
                <button onClick={openAdd} className="btn btn-primary">+ Yeni Ebat</button>
            </div>

            <div className="definitions-grid">
                {dimensions.map(d => (
                    <div key={d.id} className="definition-card">
                        <div className="card-content">
                            <div className="card-icon" style={{color:'#e67e22'}}>📏</div>
                            <h4 className="card-title">{d.dimensionName}</h4>
                        </div>
                        <div className="card-actions">
                            <button onClick={() => openEdit(d)} className="action-btn edit">Düzenle</button>
                            <button onClick={() => d.id && handleDelete(d.id)} className="action-btn delete">Sil</button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{width:'350px'}}>
                        <h3>{editingDim ? "Düzenle" : "Yeni Ekle"}</h3>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label className="form-label">Ebat Adı</label>
                                <input type="text" className="form-input" value={dimName} onChange={e=>setDimName(e.target.value)} autoFocus required />
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
export default DimensionsPage;