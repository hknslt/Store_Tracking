// src/pages/definitions/DefinitionsPage.tsx
import { useEffect, useState } from "react";
import { 
    getCategories, getGroups, 
    addGroup, updateGroup, deleteGroup,
    addCategory, updateCategory, deleteCategory 
} from "../../../services/definitionService";
import type { Category, Group } from "../../../types";
import "../../../App.css";

const DefinitionsPage = () => {
    // --- STATE'LER ---
    const [categories, setCategories] = useState<Category[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);

    // Mesaj (Toast) State'i
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Modal Kontrolü
    const [modalType, setModalType] = useState<'group' | 'category' | null>(null);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');

    // Form Verileri
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [groupName, setGroupName] = useState("");

    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [catName, setCatName] = useState("");
    const [catGroupId, setCatGroupId] = useState("");

    // --- YARDIMCI FONKSİYON: MESAJ GÖSTER ---
    const showToast = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        // 3 saniye sonra mesajı temizle
        setTimeout(() => {
            setMessage(null);
        }, 3000);
    };

    // --- VERİ YÜKLEME ---
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [catsData, groupsData] = await Promise.all([getCategories(), getGroups()]);
            setCategories(catsData);
            setGroups(groupsData);
        } catch (error) {
            console.error(error);
            showToast('error', "Veriler yüklenirken hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    // --- GRUP İŞLEMLERİ ---
    const handleGroupSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!groupName) return;

        try {
            if (modalMode === 'add') {
                await addGroup({ groupName });
                showToast('success', "Grup başarıyla eklendi.");
            } else if (modalMode === 'edit' && selectedGroup?.id) {
                await updateGroup(selectedGroup.id, { groupName });
                showToast('success', "Grup güncellendi.");
            }
            await loadData(); 
            closeModal();
        } catch (error) {
            console.error(error);
            showToast('error', "Grup işlemi başarısız oldu.");
        }
    };

    const handleDeleteGroup = async (id: string) => {
        if (window.confirm("Bu grubu silmek istediğinize emin misiniz?")) {
            try {
                await deleteGroup(id);
                setGroups(prev => prev.filter(g => g.id !== id));
                showToast('success', "Grup silindi.");
            } catch (error) {
                showToast('error', "Silme işlemi sırasında hata oluştu.");
            }
        }
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
        if (!catName || !catGroupId) return;

        try {
            if (modalMode === 'add') {
                await addCategory({ categoryName: catName, groupId: catGroupId });
                showToast('success', "Kategori başarıyla eklendi.");
            } else if (modalMode === 'edit' && selectedCategory?.id) {
                await updateCategory(selectedCategory.id, { categoryName: catName, groupId: catGroupId });
                showToast('success', "Kategori güncellendi.");
            }
            await loadData();
            closeModal();
        } catch (error) {
            console.error(error);
            showToast('error', "Kategori işlemi başarısız oldu.");
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (window.confirm("Kategoriyi silmek istediğinize emin misiniz?")) {
            try {
                await deleteCategory(id);
                setCategories(prev => prev.filter(c => c.id !== id));
                showToast('success', "Kategori silindi.");
            } catch (error) {
                showToast('error', "Silme hatası.");
            }
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
            
            {/* --- TOAST MESSAGE COMPONENT (SAĞ ÜST KÖŞE) --- */}
            {message && (
                <div className="toast-container">
                    <div className={`toast-message ${message.type === 'success' ? 'toast-success' : 'toast-error'}`}>
                        {message.type === 'success' ? '✅' : '⚠️'} {message.text}
                    </div>
                </div>
            )}

            {/* --- HEADER --- */}
            <div className="page-header">
                <div className="page-title">
                    <h2>Tanımlamalar</h2>
                    <p>Grup ve Kategori Yönetimi</p>
                </div>
                <button 
                    onClick={() => openGroupModal('add')} 
                    className="btn btn-primary"
                >
                    + Yeni Grup Ekle
                </button>
            </div>

            {/* --- GRUPLAR LİSTESİ --- */}
            <div className="dashboard-grid">
                {groups.map(group => {
                    const groupCategories = categories.filter(c => c.groupId === group.id);

                    return (
                        <div key={group.id} className="card">
                            <div className="card-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
                                <div style={{ flex: 1 }}>
                                    <h3 className="card-title">{group.groupName}</h3>
                                    <span style={{ fontSize: '11px', color: '#7f8c8d' }}>
                                        {groupCategories.length} Kategori
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <button 
                                        onClick={() => openCategoryModal('add', group.id)} 
                                        className="btn btn-success"
                                        style={{ fontSize: '11px', padding: '5px 8px' }}
                                        title="Kategori Ekle"
                                    >
                                        + Kat. Ekle
                                    </button>
                                    <button 
                                        onClick={() => openGroupModal('edit', group)} 
                                        className="btn btn-warning"
                                        style={{ fontSize: '11px', padding: '5px 8px' }}
                                        title="Grubu Düzenle"
                                    >
                                        ✎
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteGroup(group.id!)} 
                                        className="btn btn-danger"
                                        style={{ fontSize: '11px', padding: '5px 8px' }}
                                        title="Grubu Sil"
                                    >
                                        🗑
                                    </button>
                                </div>
                            </div>
                            
                            <div className="card-body">
                                {groupCategories.length === 0 ? (
                                    <div style={{ padding: '15px', color: '#999', fontSize: '13px', fontStyle: 'italic', textAlign: 'center' }}>
                                        Kategori yok.
                                    </div>
                                ) : (
                                    <table className="data-table">
                                        <tbody>
                                            {groupCategories.map(cat => (
                                                <tr key={cat.id}>
                                                    <td style={{ fontSize: '14px' }}>{cat.categoryName}</td>
                                                    <td style={{ textAlign: 'right', width: '80px' }}>
                                                        <button 
                                                            onClick={() => openCategoryModal('edit', undefined, cat)} 
                                                            style={{ cursor: 'pointer', background: 'none', border: 'none', marginRight: '5px', fontSize: '16px' }}
                                                            title="Düzenle"
                                                        >
                                                            ✎
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteCategory(cat.id!)} 
                                                            style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'red', fontSize: '16px' }}
                                                            title="Sil"
                                                        >
                                                            ×
                                                        </button>
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
                        <h3>{modalMode === 'add' ? 'Yeni Grup Ekle' : 'Grup Düzenle'}</h3>
                        <form onSubmit={handleGroupSave}>
                            <div className="form-group">
                                <label className="form-label">Grup Adı</label>
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
                        <h3>{modalMode === 'add' ? 'Yeni Kategori Ekle' : 'Kategori Düzenle'}</h3>
                        <form onSubmit={handleCategorySave}>
                            <div className="form-group">
                                <label className="form-label">Bağlı Olduğu Grup</label>
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
                                <label className="form-label">Kategori Adı</label>
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