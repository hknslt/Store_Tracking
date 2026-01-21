// src/pages/payments/PaymentList.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { getStores } from "../../services/storeService";
import { getPaymentsByStore } from "../../services/paymentService";

import type { PaymentDocument, Store, SystemUser } from "../../types";
import "../../App.css";


import StoreIcon from "../../assets/icons/store.svg";

const PaymentList = () => {
    const { currentUser } = useAuth();

    // --- STATE'LER ---
    const [payments, setPayments] = useState<PaymentDocument[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

    // BUGÜNÜN TARİHİ (YYYY-MM-DD Formatında)
    const getTodayString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const TODAY = getTodayString();

    // Filtreler (Varsayılan olarak BUGÜN seçili gelir ama değiştirilebilir)
    const [searchTerm, setSearchTerm] = useState("");
    const [startDate, setStartDate] = useState(TODAY);
    const [endDate, setEndDate] = useState(TODAY);

    // --- BAŞLANGIÇ ---
    useEffect(() => {
        const init = async () => {
            if (!currentUser) return;
            try {
                const sData = await getStores();
                setStores(sData);

                const userDoc = await getDoc(doc(db, "personnel", currentUser.uid));
                if (userDoc.exists()) {
                    const u = userDoc.data() as SystemUser;
                    if (['admin', 'control', 'report'].includes(u.role)) {
                        setIsAdmin(true);
                    } else {
                        setIsAdmin(false);
                        if (u.storeId) setSelectedStoreId(u.storeId);
                    }
                }
            } catch (error) { console.error(error); } finally { setLoading(false); }
        };
        init();
    }, [currentUser]);

    // Verileri Çek
    useEffect(() => {
        if (selectedStoreId) {
            getPaymentsByStore(selectedStoreId).then(setPayments);
        } else {
            setPayments([]);
        }
    }, [selectedStoreId]);

    // --- 1. LİSTE FİLTRESİ (Kullanıcının seçtiği tarihe göre) ---
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

    // --- 2. GÜNLÜK ÖZET HESAPLAMA (Her zaman BUGÜNÜN verisi) ---
    // Filtreden bağımsız, sadece 'TODAY' ile eşleşenleri toplar.
    const calculateDailySummary = () => {
        let tahsilat = 0;
        let masraf = 0;
        let merkez = 0;

        // Tüm ödemeler içinde sadece tarihi BUGÜN olanları bul
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

    const dailyStats = calculateDailySummary(); // <-- Kartlarda bunu kullanacağız

    // --- YARDIMCILAR ---
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('tr-TR');

    const toggleRow = (id: string) => {
        if (expandedRowId === id) setExpandedRowId(null);
        else setExpandedRowId(id);
    };

    if (loading) return <div className="page-container" style={{ textAlign: 'center', paddingTop: '100px' }}>Yükleniyor...</div>;

    return (
        <div className="page-container">
            <div className="modern-header">
                <div>
                    <h2>Kasa Hareketleri</h2>
                    <p>Ödeme, Tahsilat ve Masraf Listesi</p>
                </div>
                <Link to="/payments/add" className="modern-btn btn-primary">
                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}>+</span> Yeni İşlem
                </Link>
            </div>

            {/* --- ÖZET KARTLARI (SABİT BUGÜNÜ GÖSTERİR) --- */}
            {/* Bu kısım filtrelerden etkilenmez, her zaman bugünün canlı verisidir */}
            {selectedStoreId && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>

                    {/* GÜNLÜK TAHSİLAT */}
                    <div className="card" style={{ padding: '20px', borderLeft: '5px solid #10b981', background: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>GÜNLÜK TAHSİLAT</div>
                            <span className="status-badge success" style={{ fontSize: '10px' }}>BUGÜN</span>
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981' }}>+{dailyStats.tahsilat.toFixed(2)} ₺</div>
                    </div>

                    {/* GÜNLÜK MASRAF */}
                    <div className="card" style={{ padding: '20px', borderLeft: '5px solid #f59e0b', background: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>GÜNLÜK MASRAF</div>
                            <span className="status-badge warning" style={{ fontSize: '10px' }}>BUGÜN</span>
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#f59e0b' }}>-{dailyStats.masraf.toFixed(2)} ₺</div>
                    </div>

                    {/* GÜNLÜK MERKEZ */}
                    <div className="card" style={{ padding: '20px', borderLeft: '5px solid #ef4444', background: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>MERKEZE TRANSFER</div>
                            <span className="status-badge danger" style={{ fontSize: '10px' }}>BUGÜN</span>
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#ef4444' }}>-{dailyStats.merkez.toFixed(2)} ₺</div>
                    </div>
                </div>
            )}

            {/* --- FİLTRE BARI (LİSTEYİ ETKİLER) --- */}
            <div className="filter-bar">
                {/* Mağaza Seçimi */}
                {isAdmin ? (
                    <select className="soft-input" value={selectedStoreId} onChange={(e) => setSelectedStoreId(e.target.value)} style={{ minWidth: '200px' }}>
                        <option value="">-- Mağaza Seçiniz --</option>{stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                    </select>
                ) : (
                    <div className="status-badge neutral" style={{ padding: '10px 15px', fontSize: '14px' }}>
                        {stores.find(s => s.id === selectedStoreId)?.storeName || "Mağazam"}
                    </div>
                )}

                {/* Tarih Aralığı */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="date" className="soft-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    <span style={{ color: '#94a3b8' }}>-</span>
                    <input type="date" className="soft-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>

                {/* Arama Kutusu */}
                <input
                    type="text"
                    placeholder="Makbuz, Personel veya Açıklama..."
                    className="soft-input"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ flex: 1, minWidth: '200px' }}
                />
            </div>

            {/* --- LİSTE (SEÇİLEN TARİHE GÖRE) --- */}
            <div className="modern-table-container">
                {selectedStoreId ? (
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th style={{ width: '50px' }}></th>
                                <th>Tarih</th>
                                <th>Makbuz No</th>
                                <th>İşlemi Yapan</th>
                                <th>Özet</th>
                                <th style={{ textAlign: 'right' }}>Toplam Tutar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPayments.length > 0 ? (
                                filteredPayments.map(p => (
                                    <>
                                        {/* ANA SATIR */}
                                        <tr key={p.id} onClick={() => toggleRow(p.id!)} className="modern-row">
                                            <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: '10px' }}>
                                                {expandedRowId === p.id ? '▼' : '▶'}
                                            </td>
                                            <td style={{ color: '#64748b' }}>{formatDate(p.date)}</td>
                                            <td style={{ fontWeight: '600', color: '#1e293b' }}>{p.receiptNo}</td>
                                            <td style={{ color: '#475569' }}>{p.personnelName}</td>
                                            <td style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                                                {p.items.length} adet işlem...
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: '700', color: '#1e293b' }}>
                                                {p.totalAmount.toFixed(2)} ₺
                                            </td>
                                        </tr>

                                        {/* DETAY SATIRI */}
                                        {expandedRowId === p.id && (
                                            <tr style={{ backgroundColor: '#f8fafc' }}>
                                                <td colSpan={6} style={{ padding: '0 20px 20px 20px', border: 'none' }}>
                                                    <div className="detail-content">
                                                        <table className="modern-table" style={{ fontSize: '13px' }}>
                                                            <thead>
                                                                <tr>
                                                                    <th style={{ width: '100px' }}>Tür</th>
                                                                    <th>İlgili Kişi</th>
                                                                    <th>Ödeme Yöntemi</th>
                                                                    <th>Açıklama</th>
                                                                    <th style={{ textAlign: 'right' }}>Tutar</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {p.items.map((item, idx) => (
                                                                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                                        <td style={{ padding: '10px' }}>
                                                                            <span className={`status-badge ${item.type === 'Tahsilat' ? 'success' :
                                                                                    item.type === 'Merkez' ? 'danger' :
                                                                                        item.type === 'Masraf' ? 'warning' : 'neutral'
                                                                                }`}>
                                                                                {item.type}
                                                                            </span>
                                                                        </td>
                                                                        <td style={{ padding: '10px' }}>
                                                                            {item.customerName ? (
                                                                                <div>
                                                                                    <strong>{item.customerName}</strong>
                                                                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Fiş: {item.saleReceiptNo}</div>
                                                                                </div>
                                                                            ) : "-"}
                                                                        </td>
                                                                        <td style={{ padding: '10px', color: '#475569' }}>{item.paymentMethodId}</td>
                                                                        <td style={{ padding: '10px', color: '#475569' }}>{item.description}</td>
                                                                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: item.type === 'Tahsilat' ? '#16a34a' : '#dc2626', padding: '10px' }}>
                                                                            {item.type === 'Tahsilat' ? '+' : '-'}{Number(item.amount).toFixed(2)} ₺
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))
                            ) : (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Seçilen tarihte kayıt bulunamadı.</td></tr>
                            )}
                        </tbody>
                    </table>
                ) : (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                        <div style={{ fontSize: '40px', marginBottom: '10px', opacity: 0.5 }}><img src={StoreIcon} alt="" style={{ width: '40px', opacity: 0.6 }} /></div>
                        <p>İşlem yapmak için lütfen yukarıdan bir mağaza seçiniz.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentList;