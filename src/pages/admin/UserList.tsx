// src/pages/admin/UserList.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAllSystemUsers, getStores } from "../../services/storeService";
import { HIDDEN_EMAILS } from "../../constants/hiddenUsers";
import type { SystemUser, Store } from "../../types";
import "../../App.css";

// SVG İKONLAR
const Icons = {
    search: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
    plus: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
    user: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
};

const UserList = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<SystemUser[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const load = async () => {
            const [uData, sData] = await Promise.all([getAllSystemUsers(), getStores()]);
            setUsers(uData as SystemUser[]);
            setStores(sData);
            setLoading(false);
        };
        load();
    }, []);

    // Mağaza İsmi Bulma
    const getStoreName = (storeId?: string) => {
        if (!storeId) return "Merkez"; //   Boş ise Merkez yazsın
        return stores.find(s => s.id === storeId)?.storeName || "Bilinmiyor";
    };

    // Rol İsimlendirme ve Renklendirme
    const getRoleBadge = (role: string) => {
        let label = role;
        let colorClass = "badge-secondary"; // Varsayılan gri

        switch (role) {
            case 'admin':
                label = 'Yönetici (Admin)';
                colorClass = "badge-danger"; // Kırmızımsı
                break;
            case 'store_admin':
                label = 'Mağaza Müdürü';
                colorClass = "badge-primary"; // Mavi
                break;
            case 'control':
                label = 'Kontrol';
                colorClass = "badge-warning"; // Turuncu
                break;
            case 'report':
                label = 'Raporlayıcı';
                colorClass = "badge-info"; // Açık mavi
                break;
            case 'staff':
                label = 'Personel';
                break;
        }

        return <span className={`badge ${colorClass}`}>{label}</span>;
    };

    // Filtreleme
    const filteredUsers = users.filter(u => {
        if (!u.email) return false; // E-postası olmayanları gizle
        if (HIDDEN_EMAILS.includes(u.email)) return false; // Gizli listedekileri gizle

        const lowerSearch = searchTerm.toLowerCase();
        return (
            u.fullName.toLowerCase().includes(lowerSearch) ||
            u.email.toLowerCase().includes(lowerSearch)
        );
    });

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    return (
        <div className="page-container">
            {/* BAŞLIK VE EKLE BUTONU */}
            <div className="modern-header">
                <div>
                    <h2>Kullanıcı Yönetimi</h2>
                    <p>Sistemdeki yetkili kullanıcılar ve erişim seviyeleri</p>
                </div>
                <button onClick={() => navigate('/register')} className="modern-btn btn-primary">
                    {Icons.plus} Yeni Kullanıcı
                </button>
            </div>

            {/* ARAMA KUTUSU */}
            <div className="card" style={{ marginBottom: '20px', padding: '15px' }}>
                <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                        {Icons.search}
                    </span>
                    <input
                        type="text"
                        placeholder="İsim veya E-posta ile ara..."
                        className="form-input"
                        style={{ paddingLeft: '40px', width: '100%', boxSizing: 'border-box' }}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* TABLO */}
            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th style={{ width: '25%' }}>Ad Soyad</th>
                                <th style={{ width: '25%' }}>E-Posta</th>
                                <th style={{ width: '15%' }}>Rol</th>
                                <th style={{ width: '20%' }}>Bağlı Olduğu Mağaza</th>
                                <th style={{ width: '10%', textAlign: 'center' }}>Durum</th>
                                <th style={{ width: '5%', textAlign: 'right' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map(user => (
                                    <tr key={user.id} className="hover-row">
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                                    {Icons.user}
                                                </div>
                                                <span style={{ fontWeight: '600', color: '#1e293b' }}>{user.fullName}</span>
                                            </div>
                                        </td>
                                        <td style={{ color: '#475569' }}>{user.email}</td>
                                        <td>
                                            {getRoleBadge(user.role)}
                                        </td>
                                        <td>
                                            <span style={{
                                                fontWeight: '500',
                                                color: user.storeId ? '#334155' : '#64748b',
                                                fontStyle: user.storeId ? 'normal' : 'italic'
                                            }}>
                                                {getStoreName(user.storeId)}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {user.isActive !== false ?
                                                <span style={{ color: '#166534', backgroundColor: '#dcfce7', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>Aktif</span> :
                                                <span style={{ color: '#991b1b', backgroundColor: '#fee2e2', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>Pasif</span>
                                            }
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <Link to={`/admin/users/edit/${user.id}`} className="modern-btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                                                Düzenle
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                        Kriterlere uygun kullanıcı bulunamadı.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Stil Eklemeleri */}
            <style>{`
                .modern-btn {
                    display: flex; align-items: center; gap: 6px;
                    padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer;
                    font-weight: 600; font-size: 14px; transition: all 0.2s;
                }
                .modern-btn.btn-primary { background-color: #3b82f6; color: white; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2); }
                .modern-btn.btn-primary:hover { background-color: #2563eb; transform: translateY(-1px); }
                .modern-btn.btn-secondary { background-color: #f1f5f9; color: #475569; }
                .modern-btn.btn-secondary:hover { background-color: #e2e8f0; color: #1e293b; }

                .modern-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
                .modern-header h2 { margin: 0; font-size: 24px; color: #1e293b; }
                .modern-header p { margin: 5px 0 0; color: #64748b; font-size: 14px; }

                .modern-table { width: 100%; border-collapse: collapse; }
                .modern-table th { text-align: left; padding: 12px 15px; color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
                .modern-table td { padding: 12px 15px; vertical-align: middle; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
                .hover-row:hover { background-color: #f8fafc; }

                .badge { padding: 4px 10px; borderRadius: 6px; fontSize: 11px; fontWeight: 600; display: inline-block; }
                .badge-primary { background-color: #e0f2fe; color: #0369a1; }
                .badge-danger { background-color: #fee2e2; color: #991b1b; }
                .badge-warning { background-color: #fef3c7; color: #92400e; }
                .badge-info { background-color: #e0e7ff; color: #3730a3; }
                .badge-secondary { background-color: #f1f5f9; color: #475569; }
            `}</style>
        </div>
    );
};

export default UserList;