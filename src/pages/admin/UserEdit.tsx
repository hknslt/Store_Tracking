// src/pages/admin/UserEdit.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getUserById, getStores, updatePersonnel, deletePersonnel } from "../../services/storeService";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import type { SystemUser, Store } from "../../types";
import "../../App.css";

const UserEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const auth = getAuth();

    const [user, setUser] = useState<SystemUser | null>(null);
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);

    // Mesaj & Modal State'leri
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        fullName: "",
        role: "",
        storeId: "",
        isActive: true
    });

    // Otomatik mesaj kapatma
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    useEffect(() => {
        const load = async () => {
            if (!id) return;
            const [uData, sData] = await Promise.all([getUserById(id), getStores()]);

            if (uData) {
                setUser(uData);
                setFormData({
                    fullName: uData.fullName,
                    role: uData.role,
                    storeId: uData.storeId || "",
                    isActive: uData.isActive !== false
                });
            } else {
                navigate('/admin/users'); // Hata vermeden yönlendir
            }
            setStores(sData);
            setLoading(false);
        };
        load();
    }, [id, navigate]);

    //   ŞİFRE SIFIRLAMA
    const handlePasswordReset = async () => {
        if (!user?.email) return;
        try {
            await sendPasswordResetEmail(auth, user.email);
            setMessage({ type: 'success', text: "✅ Şifre sıfırlama e-postası gönderildi!" });
            setShowResetModal(false);
        } catch (error: any) {
            console.error(error);
            setMessage({ type: 'error', text: "Hata: " + error.message });
            setShowResetModal(false);
        }
    };

    // KAYDETME
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;

        try {
            await updatePersonnel(id, formData);
            setMessage({ type: 'success', text: "Kullanıcı bilgileri güncellendi!" });
            setTimeout(() => navigate('/admin/users'), 1500);
        } catch (error) {
            setMessage({ type: 'error', text: "Güncelleme sırasında hata oluştu." });
        }
    };

    // SİLME
    const handleDelete = async () => {
        if (!id) return;
        try {
            await deletePersonnel(id);
            navigate('/admin/users');
        } catch (error) {
            setMessage({ type: 'error', text: "Silme işlemi başarısız oldu." });
            setShowDeleteModal(false);
        }
    };

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    // --- MODAL STİLLERİ ---
    const modalOverlayStyle: React.CSSProperties = {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    };
    const modalContentStyle: React.CSSProperties = {
        backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '350px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
    };

    return (
        <div className="page-container">
            {message && <div className={`toast-message ${message.type === 'success' ? 'toast-success' : 'toast-error'}`}>{message.text}</div>}

            {/* SİLME MODALI */}
            {showDeleteModal && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3 style={{ margin: '0 0 10px 0', color: '#dc2626' }}>🗑️ Kullanıcıyı Sil?</h3>
                        <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                            Bu işlem geri alınamaz. Kullanıcı kalıcı olarak silinecek.
                        </p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button onClick={() => setShowDeleteModal(false)} className="btn btn-secondary">Vazgeç</button>
                            <button onClick={handleDelete} className="btn btn-danger">Evet, Sil</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ŞİFRE SIFIRLAMA MODALI */}
            {showResetModal && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3 style={{ margin: '0 0 10px 0', color: '#f59e0b' }}>📧 Şifre Sıfırla?</h3>
                        <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                            <strong>{user?.email}</strong> adresine şifre sıfırlama bağlantısı gönderilecek.
                        </p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button onClick={() => setShowResetModal(false)} className="btn btn-secondary">Vazgeç</button>
                            <button onClick={handlePasswordReset} className="btn btn-primary">Evet, Gönder</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="page-header">
                <div>
                    <h2 className="page-title">Kullanıcı Düzenle</h2>
                    <p>Kullanıcı: <strong>{user?.email}</strong></p>
                </div>
                <button onClick={() => navigate('/admin/users')} className="btn btn-secondary">İptal</button>
            </div>

            <div className="card" style={{ maxWidth: '600px' }}>

                {/*   ŞİFRE BİLGİ KUTUSU */}
                <div style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '20px', borderRadius: '8px', marginBottom: '25px', border: '1px solid #ffeeba' }}>
                    <div style={{ marginBottom: '10px' }}>
                        <strong>🔒 Şifre İşlemleri:</strong> Güvenlik nedeniyle şifreler görüntülenemez.
                        Eğer kullanıcı şifresini unuttuysa, aşağıdaki butona tıklayarak sıfırlama maili gönderebilirsiniz.
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowResetModal(true)}
                        className="btn"
                        style={{ backgroundColor: '#f59e0b', color: 'white', border: 'none', fontSize: '13px' }}
                    >
                        📧 Şifre Sıfırlama Linki Gönder
                    </button>
                </div>

                <form onSubmit={handleSave}>
                    <div className="form-group">
                        <label>Ad Soyad</label>
                        <input
                            className="form-input"
                            value={formData.fullName}
                            onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Rol / Yetki</label>
                        <select
                            className="form-input"
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                        >
                            <option value="admin">Yönetici (Admin)</option>
                            <option value="store_admin">Mağaza Müdürü</option>
                            <option value="staff">Personel</option>
                            <option value="control">Kontrol / Sevkiyat</option>
                            <option value="report">Raporlayıcı</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Bağlı Olduğu Mağaza</label>
                        <select
                            className="form-input"
                            value={formData.storeId}
                            onChange={e => setFormData({ ...formData, storeId: e.target.value })}
                            disabled={formData.role === 'admin'}
                        >
                            <option value="">Merkez</option>
                            {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                        </select>
                        {formData.role === 'admin' && <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>* Yöneticilerin mağaza seçmesine gerek yoktur.</div>}
                    </div>

                    <div className="form-group">
                        <label>Hesap Durumu</label>
                        <select
                            className="form-input"
                            value={formData.isActive ? "true" : "false"}
                            onChange={e => setFormData({ ...formData, isActive: e.target.value === "true" })}
                        >
                            <option value="true">Aktif (Giriş Yapabilir)</option>
                            <option value="false">Pasif (Giriş Yapamaz)</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
                        <button type="button" onClick={() => setShowDeleteModal(true)} className="btn btn-danger">Kullanıcıyı Sil</button>
                        <button type="submit" className="btn btn-primary">Kaydet</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserEdit;