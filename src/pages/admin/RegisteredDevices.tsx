// src/pages/admin/RegisteredDevices.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUsersWithDevices, revokeDeviceAccess, getPendingDeviceRequests } from "../../services/deviceService";
import { getStores } from "../../services/storeService";
import type { Store } from "../../types";
import "../../App.css";

import shieldIcon from "../../assets/icons/shield.svg";

const RegisteredDevices = () => {
    const navigate = useNavigate();
    const [usersWithDevices, setUsersWithDevices] = useState<any[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [showModal, setShowModal] = useState(false);
    const [deviceToRevoke, setDeviceToRevoke] = useState<{ userId: string, deviceId: string, userName: string, deviceName: string } | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersData, storesData, pendingReqs] = await Promise.all([
                getUsersWithDevices(),
                getStores(),
                getPendingDeviceRequests()
            ]);
            setUsersWithDevices(usersData);
            setStores(storesData);
            setPendingCount(pendingReqs.length);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const confirmRevokeClick = (userId: string, deviceId: string, userName: string, deviceName: string) => {
        setDeviceToRevoke({ userId, deviceId, userName, deviceName });
        setShowModal(true);
    };

    const executeRevoke = async () => {
        if (!deviceToRevoke) return;
        try {
            await revokeDeviceAccess(deviceToRevoke.userId, deviceToRevoke.deviceId);
            setMessage({ type: 'success', text: "✅ Cihaz erişimi başarıyla iptal edildi." });
            loadData();
        } catch (error) {
            setMessage({ type: 'error', text: "İşlem başarısız oldu." });
        } finally {
            setShowModal(false);
            setDeviceToRevoke(null);
        }
    };

    const getStoreName = (storeId?: string) => {
        if (!storeId) return "Merkez / Bağımsız Kullanıcı";
        return stores.find(s => s.id === storeId)?.storeName || "Bilinmeyen Mağaza";
    };

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    const modalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease-out' };
    const modalContentStyle: React.CSSProperties = { backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '400px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' };

    return (
        <div className="page-container">
            {message && (
                <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, padding: '15px 25px', borderRadius: '8px', color: 'white', fontWeight: '600', backgroundColor: message.type === 'success' ? '#10b981' : '#ef4444', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', animation: 'fadeIn 0.3s' }}>
                    {message.text}
                </div>
            )}

            {showModal && deviceToRevoke && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
                            <div style={{ width: '60px', height: '60px', backgroundColor: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            </div>
                        </div>

                        <h3 style={{ margin: '0 0 10px 0', color: '#1e293b' }}>Erişimi İptal Et</h3>
                        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '25px', lineHeight: '1.5' }}>
                            <strong>{deviceToRevoke.userName}</strong> kullanıcısının <strong style={{ color: '#dc2626' }}>{deviceToRevoke.deviceName}</strong> cihazına ait erişim iznini KALDIRMAK istediğinize emin misiniz?<br /><br />
                            Bu cihaz anında sistemden atılacaktır.
                        </p>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button onClick={() => setShowModal(false)} className="modern-btn btn-secondary" style={{ flex: 1 }}>İptal</button>
                            <button onClick={executeRevoke} className="modern-btn" style={{ flex: 1, backgroundColor: '#dc2626', color: 'white', border: 'none' }}>Evet, Kaldır</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="modern-header" style={{ marginBottom: '20px' }}>
                <div>
                    <h2>Kayıtlı Cihazlar (Erişim Kontrolü)</h2>
                    <p style={{ color: '#64748b' }}>Mağazaların ve kullanıcıların erişim izni olan cihazlarını yönetin.</p>
                </div>
                
                <button
                    onClick={() => navigate('/admin/devices/requests')}
                    className="modern-btn"
                    style={{ backgroundColor: pendingCount > 0 ? '#ef4444' : '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', boxShadow: pendingCount > 0 ? '0 0 15px rgba(239, 68, 68, 0.4)' : 'none' }}
                >
                    {pendingCount > 0 ? (
                        <>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'bounce 2s infinite' }}>
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                            </svg>
                            {pendingCount} Yeni Onay İsteği!
                        </>
                    ) : (
                        <>
                            <img src={shieldIcon} alt="" style={{ width: '18px', filter: 'brightness(0) invert(1)' }} />
                            Cihaz Ekle / Onayla
                        </>
                    )}
                </button>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    <table className="modern-table">
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc' }}>
                                <th style={{ width: '25%' }}>Kullanıcı / Hesap</th>
                                <th style={{ width: '20%' }}>Bağlı Olduğu Mağaza</th>
                                <th style={{ width: '55%' }}>Erişim İzni Olan Cihazlar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usersWithDevices.length > 0 ? (
                                usersWithDevices.map(user => (
                                    <tr key={user.id} className="hover-row">
                                        <td>
                                            <div style={{ fontWeight: '700', color: '#1e293b' }}>{user.fullName}</div>
                                            {/* 🔥 E-POSTA EKLENDİ */}
                                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{user.email || 'Email Yok'}</div>
                                        </td>
                                        <td style={{ color: '#475569', fontWeight: '500' }}>
                                            {getStoreName(user.storeId)}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                {user.allowedDevices.map((deviceId: string) => {
                                                    const deviceName = user.deviceNames?.[deviceId] || "İsimsiz Cihaz";
                                                    return (
                                                        <div key={deviceId} style={{ 
                                                            display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px', 
                                                            backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', minWidth: '180px' 
                                                        }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>
                                                                    </svg>
                                                                    <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '13px' }}>{deviceName}</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => confirmRevokeClick(user.id, deviceId, user.fullName, deviceName)}
                                                                    title="Erişimi İptal Et"
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 'bold', fontSize: '16px', padding: '0' }}
                                                                >
                                                                    ×
                                                                </button>
                                                            </div>
                                                            <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>ID: {deviceId}</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Sisteme kayıtlı cihazı olan kullanıcı bulunmuyor.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RegisteredDevices;