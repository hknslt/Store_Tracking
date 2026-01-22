// src/pages/definitions/DefinitionsPage.tsx
import { useEffect, useState } from "react";
import { 
    getCategories, getGroups, 
    addGroup, updateGroup, deleteGroup,
    addCategory, updateCategory, deleteCategory 
} from "../../../services/definitionService";
import type { Category, Group } from "../../../types";
import "../../../App.css";
import "../Definitions.css"; // Ortak CSS

// İkonlar
import EditIcon from "../../../assets/icons/edit.svg";
import TrashIcon from "../../../assets/icons/trash.svg";
import PlusIcon from "../../../assets/icons/plus.svg";

const DefinitionsPage = () => {
    // --- STATE'LER ---
    const [categories, setCategories] = useState<Category[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);

    // Mesaj State'i
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Modal Kontrolü
    const [modalType, setModalType] = useState<'group' | 'category' | null>(null);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');

    // Onay Modalı State'i (Silme işlemi için)
    const [confirmModal, setConfirmModal] = useState<{ show: boolean, type: 'group' | 'category', id: string } | null>(null);

    // Form Verileri
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [groupName, setGroupName] = useState("");

    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [catName, setCatName] = useState("");
    const [catGroupId, setCatGroupId] = useState("");

    // --- YARDIMCI FONKSİYON: MESAJ GÖSTER ---
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const showToast = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
    };

    // --- VERİ YÜKLEME ---
    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [catsData, groupsData] = await Promise.all([getCategories(), getGroups()]);
            groupsData.sort((a, b) => a.groupName.localeCompare(b.groupName));
            catsData.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
            
            setCategories(catsData);
            setGroups(groupsData);
        } catch (error) {
            showToast('error', "Veriler yüklenirken hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    // --- GRUP İŞLEMLERİ ---
    const handleGroupSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!groupName.trim()) return;

        try {
            if (modalMode === 'add') {
                await addGroup({ groupName });
                showToast('success', "Grup eklendi.");
            } else if (modalMode === 'edit' && selectedGroup?.id) {
                await updateGroup(selectedGroup.id, { groupName });
                showToast('success', "Grup güncellendi.");
            }
            await loadData(); 
            closeModal();
        } catch (error) {
            showToast('error', "İşlem başarısız.");
        }
    };

    // --- SİLME İŞLEMİ (ONAY SONRASI) ---
    const confirmDelete = async () => {
        if (!confirmModal) return;

        try {
            if (confirmModal.type === 'group') {
                await deleteGroup(confirmModal.id);
                setGroups(prev => prev.filter(g => g.id !== confirmModal.id));
                showToast('success', "Grup silindi.");
            } else {
                await deleteCategory(confirmModal.id);
                setCategories(prev => prev.filter(c => c.id !== confirmModal.id));
                showToast('success', "Kategori silindi.");
            }
        } catch (error) {
            showToast('error', "Silme hatası.");
        } finally {
            setConfirmModal(null); // Modalı kapat
        }
    };

    // Butonlardan çağrılan fonksiyonlar (Sadece Modalı Açar)
    const handleDeleteGroupClick = (id: string) => {
        setConfirmModal({ show: true, type: 'group', id });
    };

    const handleDeleteCategoryClick = (id: string) => {
        setConfirmModal({ show: true, type: 'category', id });
    };


    const openGroupModal = (mode: 'add' | 'edit', group?: Group) => {
        setModalType('group');
        setModalMode(mode);
        if (mode === 'edit' && group) {
            setSelectedGroup(group);
            setGroupName(group.groupName);
        } else {
            setSelectedGroup(null);
            setGroupName("");
        }
    };

    // --- KATEGORİ İŞLEMLERİ ---
    const handleCategorySave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!catName.trim() || !catGroupId) return;

        try {
            if (modalMode === 'add') {
                await addCategory({ categoryName: catName, groupId: catGroupId });
                showToast('success', "Kategori eklendi.");
            } else if (modalMode === 'edit' && selectedCategory?.id) {
                await updateCategory(selectedCategory.id, { categoryName: catName, groupId: catGroupId });
                showToast('success', "Kategori güncellendi.");
            }
            await loadData();
            closeModal();
        } catch (error) {
            showToast('error', "İşlem başarısız.");
        }
    };

    const openCategoryModal = (mode: 'add' | 'edit', groupId?: string, category?: Category) => {
        setModalType('category');
        setModalMode(mode);
        
        if (mode === 'add') {
            setCatName("");
            setCatGroupId(groupId || ""); 
            setSelectedCategory(null);
        } else if (mode === 'edit' && category) {
            setCatName(category.categoryName);
            setCatGroupId(category.groupId);
            setSelectedCategory(category);
        }
    };

    const closeModal = () => {
        setModalType(null);
        setGroupName("");
        setCatName("");
        setCatGroupId("");
    };

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    return (
        <div className="page-container">
            {message && <div className={`toast-message ${message.type === 'success' ? 'toast-success' : 'toast-error'}`}>{message.text}</div>}

            {/* --- ONAY MODALI (CONFIRMATION) --- */}
            {confirmModal && confirmModal.show && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ width: '350px', textAlign: 'center' }}>
                        <div style={{ marginBottom: '15px', fontSize: '40px' }}>⚠️</div>
                        <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Emin misiniz?</h3>
                        <p style={{ color: '#555', fontSize: '14px', marginBottom: '20px' }}>
                            {confirmModal.type === 'group' 
                                ? "Bu grubu ve bağlı kategorileri silmek üzeresiniz." 
                                : "Bu kategoriyi silmek üzeresiniz."}
                            <br/>Bu işlem geri alınamaz.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                            <button 
                                onClick={() => setConfirmModal(null)} 
                                className="btn btn-secondary"
                            >
                                Vazgeç
                            </button>
                            <button 
                                onClick={confirmDelete} 
                                className="btn btn-danger"
                            >
                                Evet, Sil
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="page-header">
                <div className="page-title">
                    <h2>Grup & Kategori</h2>
                    <p>Ürün ağacı yönetimi</p>
                </div>
                <button onClick={() => openGroupModal('add')} className="btn btn-primary">
                    + Yeni Grup
                </button>
            </div>

            <div className="definitions-grid">
                {groups.map(group => {
                    const groupCategories = categories.filter(c => c.groupId === group.id);

                    return (
                        <div key={group.id} className="definition-card card-type-group" style={{display:'block', height:'auto'}}>
                            
                            <div className="group-card-header">
                                <div style={{display:'flex', alignItems:'baseline'}}>
                                    <h3 className="group-title">{group.groupName}</h3>
                                    <span className="group-meta">({groupCategories.length})</span>
                                </div>
                                <div className="card-actions">
                                    <button onClick={() => openCategoryModal('add', group.id)} className="action-btn" title="Kategori Ekle">
                                        <img src={PlusIcon} style={{filter: 'invert(46%) sepia(90%) saturate(399%) hue-rotate(87deg) brightness(97%) contrast(92%)'}} /> 
                                    </button>
                                    <button onClick={() => openGroupModal('edit', group)} className="action-btn" title="Grubu Düzenle">
                                        <img src={EditIcon} style={{filter: 'invert(35%) sepia(93%) saturate(368%) hue-rotate(173deg)'}} /> 
                                    </button>
                                    <button onClick={() => group.id && handleDeleteGroupClick(group.id)} className="action-btn" title="Grubu Sil">
                                        <img src={TrashIcon} style={{filter: 'invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg)'}} />
                                    </button>
                                </div>
                            </div>

                            <div className="group-card-body">
                                {groupCategories.length === 0 ? (
                                    <div style={{ padding: '10px', color: '#bdc3c7', fontStyle: 'italic', fontSize:'13px', textAlign:'center' }}>
                                        Kategori yok.
                                    </div>
                                ) : (
                                    <table className="category-table">
                                        <tbody>
                                            {groupCategories.map(cat => (
                                                <tr key={cat.id}>
                                                    <td>{cat.categoryName}</td>
                                                    <td style={{ width: '60px', textAlign: 'right' }}>
                                                        <div style={{display:'flex', justifyContent:'flex-end', gap:'2px'}}>
                                                            <button 
                                                                onClick={() => openCategoryModal('edit', undefined, cat)} 
                                                                className="action-btn" 
                                                                title="Düzenle"
                                                            >
                                                                <img src={EditIcon} style={{width:'14px', height:'14px', opacity:0.5}} />
                                                            </button>
                                                            <button 
                                                                onClick={() => cat.id && handleDeleteCategoryClick(cat.id)} 
                                                                className="action-btn" 
                                                                title="Sil"
                                                            >
                                                                <img src={TrashIcon} style={{width:'14px', height:'14px', opacity:0.5, filter: 'invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg)'}} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* --- GRUP MODALI --- */}
            {modalType === 'group' && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{modalMode === 'add' ? 'Yeni Grup Ekle' : 'Grup Düzenle'}</h3>
                            <button onClick={closeModal} className="close-btn">×</button>
                        </div>
                        <form onSubmit={handleGroupSave}>
                            <div className="form-group">
                                <label>Grup Adı</label>
                                <input 
                                    type="text" className="form-input" 
                                    value={groupName} onChange={e => setGroupName(e.target.value)} 
                                    autoFocus required 
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={closeModal} className="btn btn-secondary">İptal</button>
                                <button type="submit" className="btn btn-primary">Kaydet</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- KATEGORİ MODALI --- */}
            {modalType === 'category' && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{modalMode === 'add' ? 'Yeni Kategori Ekle' : 'Kategori Düzenle'}</h3>
                            <button onClick={closeModal} className="close-btn">×</button>
                        </div>
                        <form onSubmit={handleCategorySave}>
                            <div className="form-group">
                                <label>Bağlı Olduğu Grup</label>
                                <select 
                                    className="form-input" 
                                    value={catGroupId} 
                                    onChange={e => setCatGroupId(e.target.value)}
                                    required
                                >
                                    <option value="">-- Grup Seçiniz --</option>
                                    {groups.map(g => (
                                        <option key={g.id} value={g.id}>{g.groupName}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Kategori Adı</label>
                                <input 
                                    type="text" className="form-input" 
                                    value={catName} onChange={e => setCatName(e.target.value)} 
                                    required 
                                />
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

export default DefinitionsPage;