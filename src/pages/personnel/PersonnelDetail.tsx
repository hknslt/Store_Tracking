// src/pages/personnel/PersonnelDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { getStores, deletePersonnel, updatePersonnel } from "../../services/storeService";
import { getMonthlySalesByPersonnel } from "../../services/commissionService"; 
import { getMonthlyAttendance } from "../../services/attendanceService"; 
import type { Personnel, SystemUser } from "../../types";
import "../../App.css";

// İKONLAR
const Icons = {
    edit: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
    trash: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
    userX: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="18" y1="8" x2="23" y2="13"></line><line x1="23" y1="8" x2="18" y2="13"></line></svg>,
    userCheck: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>,
    wallet: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"></path><path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z"></path></svg>,
    calendar: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
};

const PersonnelDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [person, setPerson] = useState<Personnel | SystemUser | null>(null);
    const [storeName, setStoreName] = useState("-");
    const [loading, setLoading] = useState(true);

    // 🔥 YENİ STATE'LER (İstatistikler)
    const [stats, setStats] = useState({
        monthlySales: 0,
        commissionAmount: 0,
        attendance: { geldi: 0, izin: 0, rapor: 0, ucretsiz: 0 }
    });

    // Modallar
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDismissModal, setShowDismissModal] = useState(false);

    const loadDetail = async () => {
        if (!id) return;
        try {
            const docRef = doc(db, "personnel", id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const pData = { id: docSnap.id, ...docSnap.data() } as (Personnel | SystemUser);
                setPerson(pData);

                if ('storeId' in pData && pData.storeId) {
                    // Mağaza Adını Çek
                    const sData = await getStores();
                    const s = sData.find(x => x.id === pData.storeId);
                    if (s) setStoreName(s.storeName);

                    // 🔥 EKSTRA VERİLERİ ÇEK (Satış ve Puantaj)
                    fetchExtraData(pData.storeId, pData.id!, (pData as Personnel).commissionRate || 0);
                }
            } else {
                alert("Personel bulunamadı.");
                navigate("/personnel");
            }
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    // 🔥 YENİ FONKSİYON: Ekstra verileri çeker
    const fetchExtraData = async (storeId: string, personId: string, commissionRate: number) => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        try {
            // 1. Satış Verisi (Bu Ay)
            const salesMap = await getMonthlySalesByPersonnel(storeId); // Servis tüm mağazayı döndürürse personeli seçiyoruz
            const mySales = salesMap[personId] || 0;
            const myCommission = (mySales * commissionRate) / 100;

            // 2. Puantaj Verisi (Bu Ay)
            const attData = await getMonthlyAttendance(storeId, year, month);
            const attendanceSummary = { geldi: 0, izin: 0, rapor: 0, ucretsiz: 0 };

            if (attData && attData.records) {
                Object.entries(attData.records).forEach(([key, type]) => {
                    if (key.startsWith(`${personId}_`)) {
                        if (type === 'Geldi') attendanceSummary.geldi++;
                        else if (type === 'Haftalık İzin' || type === 'Yıllık İzin') attendanceSummary.izin++;
                        else if (type === 'Raporlu') attendanceSummary.rapor++;
                        else if (type === 'Ücretsiz İzin') attendanceSummary.ucretsiz++;
                    }
                });
            }

            setStats({
                monthlySales: mySales,
                commissionAmount: myCommission,
                attendance: attendanceSummary
            });

        } catch (error) {
            console.error("Ekstra veri çekme hatası:", error);
        }
    };

    useEffect(() => { loadDetail(); }, [id]);

    // --- İŞLEMLER ---
    const handleDelete = async () => {
        if (!id) return;
        try {
            await deletePersonnel(id);
            navigate("/personnel");
        } catch (error) {
            console.error("Silme hatası:", error);
            alert("Silinirken hata oluştu.");
        }
    };

    const handleToggleStatus = async () => {
        if (!id || !person) return;
        const newStatus = !person.isActive;
        try {
            await updatePersonnel(id, { isActive: newStatus });
            setShowDismissModal(false);
            loadDetail();
        } catch (error) {
            console.error("Güncelleme hatası:", error);
            alert("Durum güncellenemedi.");
        }
    };

    const getRoleName = (role: string) => {
        switch (role) {
            case 'admin': return 'Süper Admin';
            case 'store_admin': return 'Mağaza Müdürü';
            case 'staff': return 'Personel';
            case 'control': return 'Kontrol';
            default: return role;
        }
    };

    if (loading) return <div className="page-container">Yükleniyor...</div>;
    if (!person) return <div className="page-container">Kayıt yok.</div>;

    return (
        <div className="page-container">

            {/* --- MODALLAR --- */}
            {showDeleteModal && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3>🗑️ Personeli Sil?</h3>
                        <p style={{ color: '#666' }}>Bu işlem geri alınamaz. Personel sistemden tamamen silinecek.</p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                            <button onClick={() => setShowDeleteModal(false)} className="modern-btn btn-secondary">Vazgeç</button>
                            <button onClick={handleDelete} className="modern-btn btn-danger">Evet, Sil</button>
                        </div>
                    </div>
                </div>
            )}

            {showDismissModal && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3>{person.isActive ? '⚠️ İşten Çıkarma' : '♻️ İşe Geri Alma'}</h3>
                        <p style={{ color: '#666' }}>
                            {person.isActive
                                ? "Bu personeli pasif duruma getirmek (işten çıkarmak) istediğinize emin misiniz?"
                                : "Bu personeli tekrar aktif çalışan yapmak istiyor musunuz?"}
                        </p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                            <button onClick={() => setShowDismissModal(false)} className="modern-btn btn-secondary">Vazgeç</button>
                            <button onClick={handleToggleStatus} className="modern-btn" style={{ backgroundColor: person.isActive ? '#dc2626' : '#16a34a', color: 'white' }}>
                                {person.isActive ? "Pasife Al" : "Aktif Yap"}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* --- HEADER --- */}
            <div className="modern-header">
                <div>
                    <h2>Personel Kartı</h2>
                    <p>Çalışan detay bilgileri ve yönetimi</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => navigate(-1)} className="modern-btn btn-secondary">
                        Listeye Dön
                    </button>
                    <button onClick={() => navigate(`/personnel/edit/${id}`)} className="modern-btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {Icons.edit} Düzenle
                    </button>
                </div>
            </div>

            {/* ANA GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '30px', alignItems: 'start' }}>

                {/* SOL: ÖZET KART */}
                <div className="card" style={{ padding: '30px', textAlign: 'center' }}>
                    <div style={{
                        width: '100px', height: '100px', borderRadius: '50%',
                        background: person.isActive ? '#e0e7ff' : '#f1f5f9',
                        color: person.isActive ? '#4f46e5' : '#94a3b8',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '40px', fontWeight: 'bold', margin: '0 auto 20px auto',
                        filter: person.isActive ? 'none' : 'grayscale(100%)'
                    }}>
                        {person.fullName.charAt(0).toUpperCase()}
                    </div>

                    <h3 style={{ margin: '0 0 5px 0', color: '#1e293b' }}>{person.fullName}</h3>
                    <p style={{ color: '#64748b', margin: 0 }}>{getRoleName(person.role)}</p>

                    <div style={{ marginTop: '20px', marginBottom: '30px' }}>
                        <span className={`status-badge ${person.isActive ? 'success' : 'danger'}`} style={{ padding: '8px 20px' }}>
                            {person.isActive ? "AKTİF PERSONEL" : "PASİF (İŞTEN AYRILDI)"}
                        </span>
                    </div>

                    {/* HIZLI İŞLEMLER */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button
                            onClick={() => setShowDismissModal(true)}
                            style={{
                                width: '100%', padding: '10px', borderRadius: '8px', cursor: 'pointer',
                                backgroundColor: person.isActive ? '#fff1f2' : '#f0fdf4',
                                color: person.isActive ? '#be123c' : '#15803d',
                                fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                border: `1px solid ${person.isActive ? '#fecdd3' : '#bbf7d0'}`
                            }}
                        >
                            {person.isActive ? <>{Icons.userX} BURAYI TERKET</> : <>{Icons.userCheck} Tekrar Aktif Yap</>}
                        </button>

                        <button
                            onClick={() => setShowDeleteModal(true)}
                            style={{
                                width: '100%', padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                backgroundColor: 'transparent',
                                color: '#94a3b8',
                                fontSize: '13px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                        >
                            {Icons.trash} Kaydı Tamamen Sil
                        </button>
                    </div>
                </div>

                {/* SAĞ TARAF: BİLGİLER + İSTATİSTİKLER */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* 1. KART: TEMEL BİLGİLER */}
                    <div className="card" style={{ padding: '30px' }}>
                        <h4 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginTop: 0, color: '#334155' }}>Kimlik & İletişim</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                            <div>
                                <label style={labelStyle}>TELEFON</label>
                                <div style={valueStyle}>{person.phone || "-"}</div>
                            </div>
                            <div>
                                <label style={labelStyle}>MAĞAZA</label>
                                <div style={{ ...valueStyle, color: '#4f46e5' }}>{storeName}</div>
                            </div>
                        </div>

                        <h4 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', color: '#334155' }}>Diğer Bilgiler</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <label style={labelStyle}>İŞE GİRİŞ TARİHİ</label>
                                <div style={valueStyle}>
                                    {('startDate' in person) ? new Date(person.startDate).toLocaleDateString('tr-TR') : '-'}
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>ADRES</label>
                                <div style={valueStyle}>
                                    {('address' in person) ? person.address : '-'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 🔥 2. KART: FİNANSAL & PUANTAJ ÖZETİ */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                        {/* FİNANS KARTI */}
                        <div className="card" style={{ padding: '20px', backgroundColor: '#fff' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', color: '#10b981' }}>
                                {Icons.wallet}
                                <h4 style={{ margin: 0, fontSize: '16px' }}>Finansal Durum (Bu Ay)</h4>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b', fontSize: '13px' }}>Toplam Satış:</span>
                                    <span style={{ fontWeight: 'bold', color: '#334155' }}>{stats.monthlySales.toLocaleString('tr-TR')} ₺</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b', fontSize: '13px' }}>Prim Oranı:</span>
                                    <span style={{ fontWeight: 'bold', color: '#334155' }}>%{(person as Personnel).commissionRate || 0}</span>
                                </div>
                                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Tahmini Hakediş:</span>
                                    <span style={{ fontWeight: 'bold', color: '#10b981', fontSize: '18px' }}>
                                        {stats.commissionAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* PUANTAJ KARTI */}
                        <div className="card" style={{ padding: '20px', backgroundColor: '#fff' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', color: '#3b82f6' }}>
                                {Icons.calendar}
                                <h4 style={{ margin: 0, fontSize: '16px' }}>Puantaj Özeti (Bu Ay)</h4>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div style={{ background: '#f0fdf4', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#166534' }}>{stats.attendance.geldi}</div>
                                    <div style={{ fontSize: '11px', color: '#166534' }}>Geldiği Gün</div>
                                </div>
                                <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e40af' }}>{stats.attendance.izin}</div>
                                    <div style={{ fontSize: '11px', color: '#1e40af' }}>İzinli</div>
                                </div>
                                <div style={{ background: '#fefce8', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#854d0e' }}>{stats.attendance.rapor}</div>
                                    <div style={{ fontSize: '11px', color: '#854d0e' }}>Raporlu</div>
                                </div>
                                <div style={{ background: '#fef2f2', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#991b1b' }}>{stats.attendance.ucretsiz}</div>
                                    <div style={{ fontSize: '11px', color: '#991b1b' }}>Ücretsiz</div>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </div>
    );
};

// --- STYLES ---
const labelStyle: React.CSSProperties = { fontSize: '12px', color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '5px' };
const valueStyle: React.CSSProperties = { fontSize: '15px', fontWeight: '500', color: '#1e293b' };

// Modal Stilleri
const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
};
const modalContentStyle: React.CSSProperties = {
    backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '350px', textAlign: 'center',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
};

export default PersonnelDetail;