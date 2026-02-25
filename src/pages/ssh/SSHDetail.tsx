// src/pages/ssh/SSHDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSSHRecordById, updateSSHRecord, deleteSSHRecord, updateSSHStatus } from "../../services/sshService";
import { useAuth } from "../../context/AuthContext"; //   Auth eklendi
import { db } from "../../firebase"; //   DB eklendi
import { doc, getDoc } from "firebase/firestore"; //   Firestore eklendi
import type { SSHRecord, SSHItem, SystemUser } from "../../types";
import "../../App.css";

const SSHDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth(); //   Mevcut kullanıcıyı al

    const [record, setRecord] = useState<SSHRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false); //   Yetki State'i

    // Form State
    const [editItems, setEditItems] = useState<SSHItem[]>([]);
    const [editShipping, setEditShipping] = useState("");
    const [newItem, setNewItem] = useState<SSHItem>({ description: "", price: 0 });

    // Modal & Toast State
    const [modal, setModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'danger' | 'success' | 'info';
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', type: 'info', onConfirm: () => { } });

    const [toast, setToast] = useState<{ show: boolean, msg: string, type: 'success' | 'error' }>({ show: false, msg: '', type: 'success' });

    //   KULLANICI YETKİSİNİ KONTROL ET
    useEffect(() => {
        const checkUserRole = async () => {
            if (currentUser) {
                const userDoc = await getDoc(doc(db, "personnel", currentUser.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data() as SystemUser;
                    // Sadece 'admin' rolü ise yetki ver (Gerekirse 'control' de eklenebilir)
                    if (userData.role === 'admin') {
                        setIsAdmin(true);
                    }
                }
            }
        };
        checkUserRole();
    }, [currentUser]);

    // VERİLERİ YÜKLE
    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        if (!id) return;
        setLoading(true);
        const data = await getSSHRecordById(id);
        if (data) {
            setRecord(data);
            setEditItems(data.items);
            setEditShipping(data.shippingMethod);
        } else {
            setError("Kayıt bulunamadı veya silinmiş.");
        }
        setLoading(false);
    };

    // --- YARDIMCILAR ---
    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, msg, type });
        setTimeout(() => setToast({ ...toast, show: false }), 3000);
    };

    const closeModal = () => setModal({ ...modal, isOpen: false });

    // --- İŞLEMLER ---

    const confirmComplete = () => {
        setModal({
            isOpen: true,
            title: "Tamamlandı İşlemi",
            message: "Bu kaydı 'Kapalı' (Yapıldı) olarak işaretlemek üzeresiniz. Bu işlemden sonra kayıt düzenlenemez. Emin misiniz?",
            type: 'success',
            onConfirm: async () => {
                if (!id) return;
                await updateSSHStatus(id, "Kapalı");
                showToast("Kayıt başarıyla kapatıldı.", 'success');
                loadData();
                closeModal();
            }
        });
    };

    const confirmDelete = () => {
        setModal({
            isOpen: true,
            title: "Kaydı Sil",
            message: "Bu SSH kaydını kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz!",
            type: 'danger',
            onConfirm: async () => {
                if (!id) return;
                await deleteSSHRecord(id);
                navigate("/ssh");
            }
        });
    };

    const handleSave = async () => {
        if (!id) return;
        const totalCost = editItems.reduce((acc, item) => acc + Number(item.price), 0);

        try {
            await updateSSHRecord(id, {
                items: editItems,
                shippingMethod: editShipping,
                totalCost: totalCost
            });
            setIsEditing(false);
            showToast("Değişiklikler kaydedildi!", 'success');
            loadData();
        } catch (err) {
            showToast("Kaydedilirken hata oluştu.", 'error');
        }
    };

    // --- FORM YARDIMCILARI ---
    const addItem = () => {
        if (!newItem.description) return;
        setEditItems([...editItems, newItem]);
        setNewItem({ description: "", price: 0 });
    };

    const removeItem = (index: number) => {
        setEditItems(editItems.filter((_, i) => i !== index));
    };

    if (error) {
        return (
            <div className="page-container" style={{ textAlign: 'center', marginTop: '50px' }}>
                <h3>⚠️ {error}</h3>
                <button onClick={() => navigate("/ssh")} className="btn btn-secondary" style={{ marginTop: '10px' }}>Listeye Dön</button>
            </div>
        );
    }

    if (loading) return <div className="page-container">Yükleniyor...</div>;
    if (!record) return null;

    return (
        <div className="page-container" style={{ position: 'relative' }}>

            {/* TOAST */}
            {toast.show && (
                <div style={{
                    position: 'fixed', top: '20px', right: '20px', zIndex: 1000,
                    backgroundColor: toast.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color: toast.type === 'success' ? '#166534' : '#991b1b',
                    padding: '12px 20px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    fontWeight: '600', animation: 'slideIn 0.3s ease'
                }}>
                    {toast.type === 'success' ? '✅' : '⚠️'} {toast.msg}
                </div>
            )}

            {/* MODAL */}
            {modal.isOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{
                        backgroundColor: 'white', borderRadius: '12px', padding: '25px', width: '400px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)', animation: 'fadeIn 0.2s ease'
                    }}>
                        <h3 style={{ marginTop: 0, color: modal.type === 'danger' ? '#dc2626' : '#16a34a' }}>
                            {modal.title}
                        </h3>
                        <p style={{ color: '#4b5563', lineHeight: '1.5' }}>{modal.message}</p>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                            <button
                                onClick={closeModal}
                                className="btn"
                                style={{ backgroundColor: '#f3f4f6', color: '#374151' }}
                            >
                                İptal
                            </button>
                            <button
                                onClick={modal.onConfirm}
                                className="btn"
                                style={{
                                    backgroundColor: modal.type === 'danger' ? '#dc2626' : '#16a34a',
                                    color: 'white'
                                }}
                            >
                                Onayla
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="page-header">
                <div>
                    <button onClick={() => navigate("/ssh/list")} className="btn-back">← Geri Dön</button>
                    <h2 className="page-title" style={{ marginTop: '10px' }}>SSH Kayıt Detayı</h2>
                    <p style={{ color: '#666' }}>Fiş No: <strong>{record.saleReceiptNo}</strong> | Müşteri: <strong>{record.customerName}</strong></p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    {/* Durum Butonu (Herkes görebilir, iş akışı gereği) */}
                    {record.status === 'Açık' ? (
                        <button onClick={confirmComplete} className="btn btn-success">✅ Tamamlandı (Kapat)</button>
                    ) : (
                        <span className="badge badge-success" style={{ fontSize: '14px', padding: '10px 20px' }}>Bu Kayıt Tamamlandı</span>
                    )}

                    {/*   SİLME BUTONU: Sadece Admin */}
                    {isAdmin && (
                        <button onClick={confirmDelete} className="btn btn-danger">🗑️ Sil</button>
                    )}
                </div>
            </div>

            <div className="card" style={{ padding: '20px' }}>

                {/* ÜST BİLGİLER */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
                    <div>
                        <label className="detail-label">Tarih</label>
                        <div className="detail-value">{new Date(record.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div>
                        <label className="detail-label">Telefon</label>
                        <div className="detail-value">{record.phone}</div>
                    </div>
                    <div>
                        <label className="detail-label">Toplam Tutar</label>
                        <div className="detail-value" style={{ color: '#27ae60' }}>{record.totalCost} ₺</div>
                    </div>
                </div>

                {/* İŞLEM LİSTESİ */}
                {isEditing ? (
                    <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
                        <h4 style={{ marginBottom: '10px' }}>Düzenleme Modu</h4>

                        <div style={{ marginBottom: '15px' }}>
                            <label className="form-label">Sevkiyat Yöntemi</label>
                            <select className="form-input" value={editShipping} onChange={e => setEditShipping(e.target.value)}>
                                <option value="Mağazadan Teslim">Mağazadan Teslim</option>
                                <option value="Servis Ekibi (Eve)">Servis Ekibi (Eve)</option>
                                <option value="Kargo">Kargo</option>
                                <option value="Nakliye">Nakliye</option>
                            </select>
                        </div>

                        <label className="form-label">Yapılacak İşlemler</label>
                        <table className="data-table" style={{ background: 'white' }}>
                            <thead><tr><th>Açıklama</th><th style={{ width: '100px' }}>Tutar</th><th style={{ width: '50px' }}></th></tr></thead>
                            <tbody>
                                {editItems.map((item, idx) => (
                                    <tr key={idx}>
                                        <td><input type="text" className="form-input" value={item.description} onChange={e => {
                                            const list = [...editItems]; list[idx].description = e.target.value; setEditItems(list);
                                        }} /></td>
                                        <td><input type="number" className="form-input" value={item.price} onChange={e => {
                                            const list = [...editItems]; list[idx].price = Number(e.target.value); setEditItems(list);
                                        }} /></td>
                                        <td><button onClick={() => removeItem(idx)} style={{ color: 'red', border: 'none', background: 'transparent', cursor: 'pointer' }}>X</button></td>
                                    </tr>
                                ))}
                                <tr>
                                    <td><input type="text" placeholder="Yeni işlem..." className="form-input" value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} /></td>
                                    <td><input type="number" placeholder="0" className="form-input" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: Number(e.target.value) })} /></td>
                                    <td><button onClick={addItem} className="btn btn-sm btn-primary">+</button></td>
                                </tr>
                            </tbody>
                        </table>

                        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setIsEditing(false)} className="btn btn-secondary">İptal</button>
                            <button onClick={handleSave} className="btn btn-primary">Kaydet</button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h4 style={{ margin: 0 }}>Yapılacak İşlemler</h4>
                            {/*   DÜZENLEME BUTONU: Sadece Admin ise VE Kayıt Açıksa */}
                            {isAdmin && record.status === 'Açık' && (
                                <button onClick={() => setIsEditing(true)} className="btn btn-sm btn-secondary">✏️ Düzenle</button>
                            )}
                        </div>

                        <table className="data-table">
                            <thead>
                                <tr style={{ background: '#f8f9fa' }}>
                                    <th>Açıklama</th>
                                    <th style={{ textAlign: 'right', width: '150px' }}>Tutar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {record.items.map((item, i) => (
                                    <tr key={i}>
                                        <td>{item.description}</td>
                                        <td style={{ textAlign: 'right' }}>{item.price} ₺</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ fontWeight: 'bold', background: '#f1f1f1' }}>
                                    <td style={{ textAlign: 'right' }}>Sevkiyat: {record.shippingMethod} | TOPLAM:</td>
                                    <td style={{ textAlign: 'right' }}>{record.totalCost} ₺</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}

            </div>

            <style>{`
                .detail-label { display: block; font-size: 12px; color: #7f8c8d; margin-bottom: 4px; text-transform: uppercase; font-weight: 600; }
                .detail-value { font-size: 16px; font-weight: 600; color: #2c3e50; }
                .btn-back { background: none; border: none; cursor: pointer; color: #3498db; font-weight: 600; padding: 0; margin-bottom: 5px; }
                .btn-back:hover { text-decoration: underline; }
                .badge-success { background-color: #d4edda; color: #155724; }
                .badge-warning { background-color: #fff3cd; color: #856404; }
                
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            `}</style>
        </div>
    );
};

export default SSHDetail;