// src/pages/admin/DeviceRequests.tsx
import { useEffect, useState } from "react";
import { getPendingDeviceRequests, approveDevice, rejectDevice, addDeviceManually, getAllPersonnelForDevice } from "../../services/deviceService";
import type { DeviceRequest } from "../../types";
import "../../App.css";

const DeviceRequests = () => {
    const [requests, setRequests] = useState<DeviceRequest[]>([]);

    // 🔥 Tüm kullanıcıları hem filtreleme hem e-posta eşleştirme için tutuyoruz
    const [allUsersList, setAllUsersList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [deviceNameInput, setDeviceNameInput] = useState("");

    const [modalConfig, setModalConfig] = useState<{ isOpen: boolean, type: 'approve' | 'reject', request: DeviceRequest | null }>({
        isOpen: false, type: 'approve', request: null
    });

    const [manualModalOpen, setManualModalOpen] = useState(false);
    const [filteredAdmins, setFilteredAdmins] = useState<any[]>([]); // Sadece adminleri tutacağız
    const [manualData, setManualData] = useState({ personnelId: "", deviceId: "", deviceName: "" });

    const loadRequests = async () => {
        setLoading(true);
        try {
            // 🔥 İstekleri ve tüm kullanıcıları eş zamanlı çekiyoruz
            const [data, users] = await Promise.all([
                getPendingDeviceRequests(),
                getAllPersonnelForDevice()
            ]);
            data.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
            setRequests(data);
            setAllUsersList(users);
        } catch (error) {
            setMessage({ type: 'error', text: "İstekler yüklenemedi." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadRequests(); }, []);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const handleApproveClick = (req: DeviceRequest) => {
        setDeviceNameInput("");
        setModalConfig({ isOpen: true, type: 'approve', request: req });
    };
    const handleRejectClick = (req: DeviceRequest) => setModalConfig({ isOpen: true, type: 'reject', request: req });

    const executeAction = async () => {
        const { type, request } = modalConfig;
        if (!request) return;

        if (type === 'approve' && !deviceNameInput.trim()) {
            setMessage({ type: 'error', text: "Lütfen cihaz için bir isim giriniz (Örn: Kasa 1)" });
            return;
        }

        setModalConfig({ ...modalConfig, isOpen: false });

        if (type === 'approve') {
            try {
                await approveDevice(request.id!, request.personnelId, request.deviceId, deviceNameInput.trim());
                setMessage({ type: 'success', text: "✅ Cihaz başarıyla onaylandı ve isimlendirildi!" });
                loadRequests();
            } catch (error) {
                setMessage({ type: 'error', text: "Onaylama işlemi başarısız." });
            }
        } else {
            try {
                await rejectDevice(request.id!);
                setMessage({ type: 'success', text: "❌ Cihaz talebi reddedildi." });
                loadRequests();
            } catch (error) {
                setMessage({ type: 'error', text: "Reddetme işlemi başarısız." });
            }
        }
    };

    // 🔥 MANUEL EKLEME: Sadece Mağaza Adminlerini Filtrele
    const openManualModal = () => {
        setManualModalOpen(true);
        // Zaten loadRequests'te çektiğimiz listeden sadece store_admin olanları seçiyoruz
        const admins = allUsersList.filter(u => u.role === 'store_admin');
        setFilteredAdmins(admins);
    };

    const handleManualSubmit = async () => {
        if (!manualData.personnelId || !manualData.deviceId.trim() || !manualData.deviceName.trim()) {
            setMessage({ type: 'error', text: "Lütfen tüm alanları doldurunuz." });
            return;
        }
        try {
            await addDeviceManually(manualData.personnelId, manualData.deviceId.trim(), manualData.deviceName.trim());
            setMessage({ type: 'success', text: "✅ Cihaz manuel olarak eklendi!" });
            setManualModalOpen(false);
            setManualData({ personnelId: "", deviceId: "", deviceName: "" });
        } catch (error) {
            setMessage({ type: 'error', text: "Ekleme başarısız oldu." });
        }
    };

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    const modalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease-out' };
    const modalContentStyle: React.CSSProperties = { backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '450px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' };

    return (
        <div className="page-container">
            {message && (
                <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, padding: '15px 25px', borderRadius: '8px', color: 'white', fontWeight: '600', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', backgroundColor: message.type === 'success' ? '#10b981' : '#ef4444', animation: 'fadeIn 0.3s ease-in-out' }}>
                    {message.text}
                </div>
            )}

            {/* 🔥 MANUEL CİHAZ EKLEME MODALI */}
            {manualModalOpen && (
                <div style={modalOverlayStyle}>
                    <div style={{ ...modalContentStyle, textAlign: 'left' }}>
                        <h3 style={{ margin: '0 0 20px 0', color: '#1e293b', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '8px' }}>
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>
                            </svg>
                            Manuel Cihaz Tanımla
                        </h3>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px' }}>Mağaza Yöneticisi Seçin</label>
                            <select className="form-input" style={{ width: '100%', padding: '10px' }} value={manualData.personnelId} onChange={e => setManualData({ ...manualData, personnelId: e.target.value })}>
                                <option value="">-- Kullanıcı Seçiniz --</option>
                                {/* Sadece store_admin'ler listelenir */}
                                {filteredAdmins.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.fullName} - {u.email || 'E-Posta Yok'}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px' }}>Cihaz Kodu (Machine ID)</label>
                            <input className="form-input" placeholder="Örn: a1b2c3d4-..." style={{ width: '100%', padding: '10px' }} value={manualData.deviceId} onChange={e => setManualData({ ...manualData, deviceId: e.target.value })} />
                        </div>
                        <div style={{ marginBottom: '25px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px' }}>Cihaz Adı (Takma İsim)</label>
                            <input className="form-input" placeholder="Cihaz Adı" style={{ width: '100%', padding: '10px' }} value={manualData.deviceName} onChange={e => setManualData({ ...manualData, deviceName: e.target.value })} />
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setManualModalOpen(false)} className="modern-btn btn-secondary" style={{ flex: 1 }}>İptal</button>
                            <button onClick={handleManualSubmit} className="modern-btn btn-primary" style={{ flex: 1 }}>Cihazı Kaydet</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🔥 ONAY/RED MODALI */}
            {modalConfig.isOpen && modalConfig.request && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        {modalConfig.type === 'approve' ? (
                            <div style={{ width: '60px', height: '60px', backgroundColor: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto' }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>
                            </div>
                        ) : (
                            <div style={{ width: '60px', height: '60px', backgroundColor: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto' }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                            </div>
                        )}

                        <h3 style={{ margin: '0 0 10px 0', color: '#1e293b' }}>
                            {modalConfig.type === 'approve' ? 'Cihaza İzin Ver ve İsimlendir' : 'Talebi Reddet?'}
                        </h3>

                        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '15px', lineHeight: '1.5' }}>
                            {modalConfig.type === 'approve' ? (
                                <><strong>{modalConfig.request.personnelName}</strong> kullanıcısı için bu cihaza bir isim verin:</>
                            ) : (
                                <><strong>{modalConfig.request.personnelName}</strong> kullanıcısının bu cihazına ait erişim talebini <strong>reddetmek</strong> istediğinize emin misiniz?</>
                            )}
                        </p>

                        {modalConfig.type === 'approve' && (
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Cihaz Adı"
                                value={deviceNameInput}
                                onChange={e => setDeviceNameInput(e.target.value)}
                                style={{ width: '100%', padding: '12px', marginBottom: '25px', textAlign: 'center', fontWeight: 'bold' }}
                            />
                        )}

                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button onClick={() => setModalConfig({ ...modalConfig, isOpen: false })} className="modern-btn btn-secondary" style={{ flex: 1 }}>Vazgeç</button>
                            <button
                                onClick={executeAction}
                                className="modern-btn"
                                style={{ flex: 1, backgroundColor: modalConfig.type === 'approve' ? '#10b981' : '#dc2626', color: 'white', border: 'none' }}
                            >
                                {modalConfig.type === 'approve' ? 'Evet, Onayla' : 'Evet, Reddet'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="modern-header" style={{ marginBottom: '20px' }}>
                <div>
                    <h2>Cihaz Erişim İstekleri</h2>
                    <p style={{ color: '#64748b' }}>Sisteme yeni bir bilgisayardan giriş yapmaya çalışan hesapların onay listesi.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => window.history.back()} className="modern-btn btn-secondary">
                        ← Kayıtlı Cihazlara Dön
                    </button>
                    <button onClick={openManualModal} className="modern-btn" style={{ backgroundColor: '#1e293b', color: 'white', border: 'none' }}>
                        + Manuel Cihaz Tanımla
                    </button>
                </div>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    <table className="modern-table">
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc' }}>
                                <th style={{ width: '20%' }}>İstek Tarihi</th>
                                <th style={{ width: '25%' }}>Kullanıcı Detayları</th>
                                <th style={{ width: '30%' }}>Cihaz Kodu (Machine ID)</th>
                                <th style={{ width: '25%', textAlign: 'right' }}>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.length > 0 ? (
                                requests.map(req => {
                                    // 🔥 E-posta bilgisini bulmak için tüm kullanıcılar listesinden eşleştiriyoruz
                                    const userEmail = allUsersList.find(u => u.id === req.personnelId)?.email || 'E-Posta Bulunamadı';

                                    return (
                                        <tr key={req.id} className="hover-row">
                                            <td style={{ color: '#64748b', fontSize: '13px' }}>{new Date(req.requestedAt).toLocaleString('tr-TR')}</td>
                                            <td>
                                                <div style={{ fontWeight: '700', color: '#1e293b' }}>{req.personnelName}</div>
                                                {/* E-posta alanı buraya eklendi */}
                                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{userEmail}</div>
                                            </td>
                                            <td style={{ fontFamily: 'monospace', color: '#0ea5e9', fontWeight: 'bold' }}>{req.deviceId}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button
                                                    onClick={() => handleApproveClick(req)}
                                                    className="modern-btn"
                                                    style={{ backgroundColor: '#10b981', color: 'white', border: 'none', marginRight: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                    </svg>
                                                    Onayla
                                                </button>
                                                <button
                                                    onClick={() => handleRejectClick(req)}
                                                    className="modern-btn"
                                                    style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                                    </svg>
                                                    Reddet
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                            </svg>
                                        </div>
                                        Bekleyen cihaz onay isteği bulunmamaktadır.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DeviceRequests;