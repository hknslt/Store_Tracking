// src/pages/payments/PaymentList.tsx
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { getStores } from "../../services/storeService";
import { getPaymentsByStore } from "../../services/paymentService";
import { Link, useNavigate } from "react-router-dom";

import type { PaymentDocument, Store, SystemUser } from "../../types";
import "../../App.css";

import StoreIcon from "../../assets/icons/store.svg";

const PaymentList = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // --- YARDIMCI FONKSİYONLAR ---
    const getTodayString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const TODAY = getTodayString();

    // --- STATE'LER (Hafıza / Cache Destekli) ---
    const [payments, setPayments] = useState<PaymentDocument[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    // Filtreleri SessionStorage'dan al veya varsayılanı kullan
    const cachedStoreId = sessionStorage.getItem("paymentList_storeId") || "";
    const cachedStart = sessionStorage.getItem("paymentList_startDate") || TODAY;
    const cachedEnd = sessionStorage.getItem("paymentList_endDate") || TODAY;

    const [selectedStoreId, setSelectedStoreId] = useState(cachedStoreId);
    const [startDate, setStartDate] = useState(cachedStart);
    const [endDate, setEndDate] = useState(cachedEnd);
    const [searchTerm, setSearchTerm] = useState("");

    // --- HAFIZAYA KAYDETME (SessionStorage) ---
    useEffect(() => {
        sessionStorage.setItem("paymentList_startDate", startDate);
        sessionStorage.setItem("paymentList_endDate", endDate);
    }, [startDate, endDate]);

    useEffect(() => {
        if (selectedStoreId) sessionStorage.setItem("paymentList_storeId", selectedStoreId);
    }, [selectedStoreId]);

    // --- BAŞLANGIÇ YÜKLEMESİ ---
    useEffect(() => {
        const init = async () => {
            if (!currentUser) return;
            try {
                const sData = await getStores();
                setStores(sData);

                const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                let uData = userDoc.exists() ? userDoc.data() as SystemUser : null;

                if (!uData) {
                    const pDoc = await getDoc(doc(db, "personnel", currentUser.uid));
                    if (pDoc.exists()) uData = pDoc.data() as SystemUser;
                }

                if (uData) {
                    const hasAdminAccess = ['admin', 'control', 'report'].includes(uData.role);
                    setIsAdmin(hasAdminAccess);

                    if (!hasAdminAccess) {
                        // Admin değilse tarihi BUGÜN'e zorla ve mağazasını sabitle
                        if (uData.storeId) setSelectedStoreId(uData.storeId);
                        setStartDate(TODAY);
                        setEndDate(TODAY);
                    }
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [currentUser, TODAY]);

    // --- VERİLERİ ÇEK ---
    useEffect(() => {
        if (selectedStoreId) {
            setLoading(true);
            getPaymentsByStore(selectedStoreId).then(data => {
                setPayments(data);
                setLoading(false);
            });
        } else {
            setPayments([]);
        }
    }, [selectedStoreId]);

    // --- 1. LİSTE FİLTRESİ ---
    const filteredPayments = payments.filter(p => {
        const pDate = new Date(p.date);
        const start = new Date(`${startDate}T00:00:00`);
        const end = new Date(`${endDate}T23:59:59`);

        const isDateInRange = pDate >= start && pDate <= end;
        const lowerSearch = searchTerm.toLowerCase();
        const matchesSearch =
            p.receiptNo.toLowerCase().includes(lowerSearch) ||
            p.personnelName.toLowerCase().includes(lowerSearch) ||
            p.items.some(i => i.description?.toLowerCase().includes(lowerSearch) || i.customerName?.toLowerCase().includes(lowerSearch));

        return isDateInRange && matchesSearch;
    });

    // --- 2. GÜNLÜK ÖZET (Sadece Bugünü Hesaplar) ---
    const calculateDailySummary = () => {
        let tahsilat = 0, masraf = 0, merkez = 0;
        const todaysData = payments.filter(p => p.date.startsWith(TODAY));

        for (const p of todaysData) {
            for (const item of p.items) {
                const val = Number(item.amount);
                if (item.type === 'Tahsilat') tahsilat += val;
                else if (item.type === 'Masraf') masraf += val;
                else if (item.type === 'Merkez') merkez += val;
            }
        }
        return { tahsilat, masraf, merkez };
    };

    const dailyStats = calculateDailySummary();
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('tr-TR');

    if (loading && payments.length === 0) return <div className="page-container" style={{ textAlign: 'center', paddingTop: '100px' }}>Yükleniyor...</div>;

    return (
        <div className="page-container">
            {/* ÜST BİLGİ */}
            <div className="modern-header" style={{ marginBottom: '25px' }}>
                <div>
                    <h2>Kasa Hareketleri</h2>
                    <p style={{ color: '#64748b' }}>Ödeme, Tahsilat ve Masraf Listesi</p>
                </div>
                <Link to="/payments/add" className="modern-btn" style={{ backgroundColor: '#10b981', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}>
                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}>+</span> Yeni İşlem Ekle
                </Link>
            </div>

            {/* --- ÖZET KARTLARI --- */}
            {selectedStoreId && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                    <div className="card" style={{ padding: '20px', borderLeft: '4px solid #10b981', background: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>GÜNLÜK TAHSİLAT</div>
                            <span className="status-badge success" style={{ fontSize: '10px' }}>BUGÜN</span>
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: '#10b981' }}>+{dailyStats.tahsilat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</div>
                    </div>

                    <div className="card" style={{ padding: '20px', borderLeft: '4px solid #f59e0b', background: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>GÜNLÜK MASRAF</div>
                            <span className="status-badge warning" style={{ fontSize: '10px' }}>BUGÜN</span>
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: '#f59e0b' }}>-{dailyStats.masraf.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</div>
                    </div>

                    <div className="card" style={{ padding: '20px', borderLeft: '4px solid #ef4444', background: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>MERKEZE TRANSFER</div>
                            <span className="status-badge danger" style={{ fontSize: '10px' }}>BUGÜN</span>
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: '#ef4444' }}>-{dailyStats.merkez.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</div>
                    </div>
                </div>
            )}

            {/* --- FİLTRE ÇUBUĞU (Kompakt ve Düzenli Grid) --- */}
            <div className="card" style={{ marginBottom: '20px', padding: '15px 20px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', alignItems: 'end' }}>

                    {/* Mağaza Seçimi */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '5px' }}>Mağaza</label>
                        {isAdmin ? (
                            <select className="form-input" value={selectedStoreId} onChange={(e) => setSelectedStoreId(e.target.value)} style={{ width: '100%', borderColor: '#cbd5e1', padding: '8px 12px' }}>
                                <option value="">-- Mağaza Seçiniz --</option>
                                {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                            </select>
                        ) : (
                            <div style={{ padding: '8px 15px', backgroundColor: '#e2e8f0', borderRadius: '8px', color: '#334155', fontWeight: '600', fontSize: '14px', border: '1px solid #cbd5e1' }}>
                                {stores.find(s => s.id === selectedStoreId)?.storeName || "Mağazam"}
                            </div>
                        )}
                    </div>

                    {/* Tarih Aralığı */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '5px' }}>
                            Tarih Aralığı {!isAdmin && <span style={{ color: '#ef4444', fontSize: '10px', marginLeft: '5px' }}>(Sadece Yöneticiler)</span>}
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                                type="date"
                                className="form-input"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                disabled={!isAdmin}
                                style={{ flex: 1, borderColor: '#cbd5e1', backgroundColor: !isAdmin ? '#f1f5f9' : 'white', cursor: !isAdmin ? 'not-allowed' : 'auto', color: !isAdmin ? '#94a3b8' : 'inherit', padding: '8px 12px' }}
                            />
                            <span style={{ color: '#94a3b8', fontWeight: 'bold' }}>-</span>
                            <input
                                type="date"
                                className="form-input"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                disabled={!isAdmin}
                                style={{ flex: 1, borderColor: '#cbd5e1', backgroundColor: !isAdmin ? '#f1f5f9' : 'white', cursor: !isAdmin ? 'not-allowed' : 'auto', color: !isAdmin ? '#94a3b8' : 'inherit', padding: '8px 12px' }}
                            />
                        </div>
                    </div>

                    {/* Arama */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '5px' }}>İşlem Ara</label>
                        <input
                            type="text"
                            placeholder="Makbuz, Müşteri veya Açıklama..."
                            className="form-input"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ width: '100%', borderColor: '#cbd5e1', padding: '8px 12px' }}
                        />
                    </div>
                </div>
            </div>

            {/* --- LİSTE --- */}
            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {selectedStoreId ? (
                        <table className="modern-table">
                            <thead>
                                <tr style={{ backgroundColor: '#f1f5f9' }}>
                                    <th style={{ width: '80px', textAlign: 'center' }}>İşlem</th>
                                    <th style={{ width: '15%' }}>Tarih</th>
                                    <th style={{ width: '20%' }}>Makbuz No</th>
                                    <th style={{ width: '25%' }}>İşlemi Yapan</th>
                                    <th style={{ width: '15%' }}>Özet</th>
                                    <th style={{ textAlign: 'right', width: '20%' }}>Toplam Tutar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPayments.length > 0 ? (
                                    filteredPayments.map(p => (
                                        <tr key={p.id} className="hover-row">
                                            <td style={{ textAlign: 'center' }}>
                                                <button onClick={() => navigate(`/payments/detail/${p.id}`)} className="modern-btn" style={{ padding: '6px 12px', fontSize: '12px', background: '#e0f2fe', color: '#0284c7', border: 'none', cursor: 'pointer' }}>
                                                    🔍 Detay
                                                </button>
                                            </td>
                                            <td style={{ color: '#64748b' }}>{formatDate(p.date)}</td>
                                            <td style={{ fontWeight: '700', color: '#334155' }}>{p.receiptNo}</td>
                                            <td style={{ color: '#475569' }}>{p.personnelName}</td>
                                            <td style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                                                {p.items.length} adet işlem
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: '800', color: '#1e293b', fontSize: '15px' }}>
                                                {p.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                            <div style={{ fontSize: '24px', marginBottom: '10px' }}>🧾</div>
                                            Belirtilen kriterlerde işlem bulunamadı.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                            <div style={{ fontSize: '40px', marginBottom: '10px', opacity: 0.5 }}>
                                <img src={StoreIcon} alt="" style={{ width: '40px', opacity: 0.6 }} />
                            </div>
                            <p style={{ fontSize: '16px', fontWeight: '500' }}>İşlemleri görüntülemek için lütfen yukarıdan bir mağaza seçiniz.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentList;