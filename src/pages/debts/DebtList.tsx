// src/pages/debts/DebtList.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getDebtsByStore } from "../../services/debtService";
import { getStores } from "../../services/storeService";
import type { Debt, Store } from "../../types";
import { motion } from "framer-motion";
import { exportDebtsToExcel } from "../../utils/excelExport";
import cardIcon from "../../assets/icons/credit-card.svg";

type SortOption = 'name_asc' | 'date_desc' | 'receipt_asc' | 'amount_desc' | 'remaining_desc';

const DebtList = () => {
    const { userData, userRole } = useAuth();
    const navigate = useNavigate();

    const [debts, setDebts] = useState<Debt[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState<string>("");

    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState<'Hepsi' | 'Ödenmedi' | 'Kısmi Ödeme' | 'Ödendi'>('Hepsi');

    // 🔥 SIRALAMA STATE'İ (Varsayılan İsime göre A-Z)
    const [sortBy, setSortBy] = useState<SortOption>('name_asc');

    // --- BAŞLANGIÇ AYARLARI ---
    useEffect(() => {
        const init = async () => {
            if (userRole === 'admin' || userRole === 'control') {
                const storeList = await getStores();
                setStores(storeList);
                if (storeList.length > 0) setSelectedStoreId(storeList[0].id!);
            } else {
                if (userData?.storeId) {
                    setSelectedStoreId(userData.storeId);
                }
            }
        };
        init();
    }, [userRole, userData]);

    // --- MAĞAZA SEÇİLİNCE BORÇLARI ÇEK ---
    useEffect(() => {
        if (selectedStoreId) {
            setLoading(true);
            getDebtsByStore(selectedStoreId).then(data => {
                setDebts(data);
                setLoading(false);
            });
        }
    }, [selectedStoreId]);

    // --- FİLTRELEME VE SIRALAMA (Tek bir fonksiyonda) ---
    const getProcessedDebts = () => {
        // 1. Önce Filtrele
        let processed = debts.filter(debt => {
            const matchesSearch =
                debt.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                debt.receiptNo.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = filterStatus === 'Hepsi' ? true : debt.status === filterStatus;

            return matchesSearch && matchesStatus;
        });

        // 2. Sonra Sırala
        processed.sort((a, b) => {
            switch (sortBy) {
                case 'name_asc': // A'dan Z'ye (Alfabetik)
                    return a.customerName.localeCompare(b.customerName, 'tr');
                case 'date_desc': // Tarihe Göre (En Yeni)
                    return new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime();
                case 'receipt_asc': // Fiş Numarasına Göre (Artan)
                    return a.receiptNo.localeCompare(b.receiptNo, undefined, { numeric: true });
                case 'amount_desc': // Toplam Tutara Göre (Yüksekten Düşüğe)
                    return b.totalAmount - a.totalAmount;
                case 'remaining_desc': // Kalan Borca Göre (Yüksekten Düşüğe)
                    return b.remainingAmount - a.remainingAmount;
                default:
                    return 0;
            }
        });

        return processed;
    };

    const processedDebts = getProcessedDebts();

    // --- İSTATİSTİKLER ---
    const totalDebt = processedDebts.reduce((acc, d) => acc + d.totalAmount, 0);
    const totalPaid = processedDebts.reduce((acc, d) => acc + (d.paidAmount || 0), 0);
    const totalRemaining = totalDebt - totalPaid;

    const formatMoney = (amount: number) => {
        return amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";
    };

    const BAHCEMO_GREEN = "#1e703a";
    const currentStoreName = stores.find(s => s.id === selectedStoreId)?.storeName || "Mağaza";

    return (
        <div className="page-container" style={{ backgroundColor: '#f4f7f6', minHeight: '100vh' }}>

            {/* ÜST BAR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#2c3e50' }}>Müşteri Cari / Borç Takibi</h2>
                    <p style={{ margin: '5px 0 0', color: '#7f8c8d', fontSize: '14px' }}>Açık hesap satışların takibi</p>
                </div>

                {/* Admin ise Mağaza Seçimi Göster */}
                {(userRole === 'admin' || userRole === 'control') && (
                    <select
                        value={selectedStoreId}
                        onChange={(e) => setSelectedStoreId(e.target.value)}
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontWeight: 'bold' }}
                    >
                        {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                    </select>
                )}


                <div style={{ display: 'flex', gap: '10px' }}>
                    {/*EXCEL BUTONU */}
                    <button
                        onClick={() => exportDebtsToExcel(processedDebts, currentStoreName)}
                        className="btn"
                        style={{ backgroundColor: '#27ae60', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}
                    >
                        Excel İndir
                    </button>

                    <button onClick={() => navigate(userRole === 'store_admin' ? `/stores/${userData?.storeId}` : '/')} className="btn btn-secondary">
                        ← Geri Dön
                    </button>
                </div>
            </div>

            {/* ÖZET KARTLARI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <SummaryCard title="Toplam Alacak" amount={totalDebt} color="#3498db" />
                <SummaryCard title="Tahsil Edilen" amount={totalPaid} color="#27ae60" />
                <SummaryCard title="Kalan Risk (Bakiye)" amount={totalRemaining} color="#e74c3c" isBold />
            </div>

            {/* FİLTRE, ARAMA VE SIRALAMA */}
            <div className="card" style={{ padding: '15px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>

                    {/* Sol Kısım: Arama ve Durum */}
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', flex: 1 }}>
                        <input
                            type="text"
                            placeholder="Müşteri Adı veya Fiş No Ara..."
                            style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', minWidth: '200px' }}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />

                        <div style={{ display: 'flex', gap: '5px' }}>
                            {['Hepsi', 'Ödenmedi', 'Kısmi Ödeme', 'Ödendi'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status as any)}
                                    style={{
                                        padding: '10px 15px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        backgroundColor: filterStatus === status ? BAHCEMO_GREEN : 'white',
                                        color: filterStatus === status ? 'white' : '#64748b',
                                        transition: 'all 0.2s',
                                        fontSize: '13px',
                                        fontWeight: '600'
                                    }}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sağ Kısım: Sıralama */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b', whiteSpace: 'nowrap' }}>Sırala:</label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#1e293b', outline: 'none' }}
                        >
                            <option value="name_asc">İsime Göre (A-Z)</option>
                            <option value="date_desc">Tarihe Göre (En Yeni)</option>
                            <option value="receipt_asc">Fiş No'ya Göre</option>
                            <option value="amount_desc">Toplam Tutara Göre (Yüksek-Düşük)</option>
                            <option value="remaining_desc">Kalan Borca Göre (Yüksek-Düşük)</option>
                        </select>
                    </div>

                </div>
            </div>

            {/* MÜŞTERİ LİSTESİ (KARTLAR) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {loading ? <div>Yükleniyor...</div> : processedDebts.map((debt) => (
                    <DebtCard key={debt.id} debt={debt} formatMoney={formatMoney} navigate={navigate} />
                ))}

                {!loading && processedDebts.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#94a3b8', padding: '40px', width: '100%', fontSize: '15px' }}>
                        Bu kriterlere uygun kayıt bulunamadı.
                    </div>
                )}
            </div>

        </div>
    );
};

// --- ALT BİLEŞENLER ---

const SummaryCard = ({ title, amount, color, isBold }: any) => (
    <div className="card" style={{ padding: '20px', borderLeft: `5px solid ${color}` }}>
        <div style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '5px', textTransform: 'uppercase', fontWeight: 'bold' }}>{title}</div>
        <div style={{ fontSize: '24px', fontWeight: isBold ? '800' : '600', color: '#2c3e50' }}>
            {amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
        </div>
    </div>
);

const DebtCard = ({ debt, formatMoney, navigate }: { debt: Debt, formatMoney: any, navigate: any }) => {
    const paid = debt.paidAmount || 0;
    const total = debt.totalAmount || 1;
    const percentage = Math.min(100, Math.max(0, (paid / total) * 100));

    let statusColor = '#e74c3c';
    if (debt.status === 'Kısmi Ödeme') statusColor = '#f39c12';
    if (debt.status === 'Ödendi') statusColor = '#27ae60';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
            onClick={() => navigate(`/debts/${debt.storeId}/${debt.saleId}`)}
            style={{
                padding: '20px',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 15px rgba(0,0,0,0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)'}
        >
            {/* Üst Kısım */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                <div>
                    <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#2c3e50' }}>{debt.customerName}</div>
                    <div style={{ fontSize: '12px', color: '#95a5a6', marginTop: '2px' }}>Fiş: {debt.receiptNo} • {debt.saleDate ? new Date(debt.saleDate).toLocaleDateString('tr-TR') : '-'}</div>
                </div>
                <span style={{
                    backgroundColor: `${statusColor}20`,
                    color: statusColor,
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 'bold'
                }}>
                    {debt.status}
                </span>
            </div>

            {/* Orta Kısım */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
                <div>
                    <div style={{ fontSize: '11px', color: '#95a5a6' }}>Toplam Tutar</div>
                    <div style={{ fontWeight: '600' }}>{formatMoney(debt.totalAmount)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#e74c3c' }}>Kalan Borç</div>
                    <div style={{ fontWeight: 'bold', color: '#e74c3c', fontSize: '16px' }}>{formatMoney(debt.remainingAmount)}</div>
                </div>
            </div>

            {/* İlerleme Çubuğu */}
            <div style={{ width: '100%', height: '8px', backgroundColor: '#ecf0f1', borderRadius: '4px', marginBottom: '15px', overflow: 'hidden' }}>
                <div style={{
                    width: `${percentage}%`,
                    height: '100%',
                    backgroundColor: statusColor,
                    borderRadius: '4px',
                    transition: 'width 0.5s ease'
                }}></div>
            </div>

            {/* Alt Kısım */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: '#95a5a6' }}>
                    Ödenen: {formatMoney(paid)} (%{percentage.toFixed(0)})
                </div>

                {debt.remainingAmount > 0.5 && (
                    <button

                        onClick={(e) => {
                            e.stopPropagation();
                            navigate('/payments/add', {
                                state: {
                                    preSelectedDebt: {
                                        saleId: debt.saleId,
                                        storeId: debt.storeId,
                                        customerName: debt.customerName,
                                        receiptNo: debt.receiptNo,
                                        remainingAmount: debt.remainingAmount
                                    }
                                }
                            });
                        }}
                        style={{
                            backgroundColor: '#3498db',
                            color: 'white',
                            border: 'none',
                            padding: '8px 15px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <img
                            src={cardIcon}
                            alt="Tahsilat"
                            style={{ width: '16px', height: '16px', filter: 'brightness(0) invert(1)' }}
                        />
                        Tahsilat
                    </button>
                )}
            </div>
        </motion.div>
    );
};

export default DebtList;