// src/pages/debts/DebtList.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getDebtsByStore } from "../../services/debtService";
import { getStores } from "../../services/storeService"; // Admin için mağaza listesi
import type { Debt, Store } from "../../types";
import { motion } from "framer-motion";


import cardIcon from "../../assets/icons/credit-card.svg"; // Veya kart ikonunuzun adı/yolu neyse

const DebtList = () => {
    const { userData, userRole } = useAuth();
    const navigate = useNavigate();

    const [debts, setDebts] = useState<Debt[]>([]);
    const [stores, setStores] = useState<Store[]>([]); // Admin için
    const [selectedStoreId, setSelectedStoreId] = useState<string>(""); // Seçili Mağaza

    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState<'Hepsi' | 'Ödenmedi' | 'Kısmi Ödeme' | 'Ödendi'>('Hepsi');

    // --- BAŞLANGIÇ AYARLARI ---
    useEffect(() => {
        const init = async () => {
            if (userRole === 'admin' || userRole === 'control') {
                // Admin ise Mağazaları Çek
                const storeList = await getStores();
                setStores(storeList);
                // İlk mağazayı otomatik seç (Boş kalmasın)
                if (storeList.length > 0) setSelectedStoreId(storeList[0].id!);
            } else {
                // Mağaza Müdürü ise kendi mağazasını seç
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

    // --- FİLTRELEME ---
    const filteredDebts = debts.filter(debt => {
        const matchesSearch =
            debt.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            debt.receiptNo.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = filterStatus === 'Hepsi' ? true : debt.status === filterStatus;

        return matchesSearch && matchesStatus;
    });

    // --- İSTATİSTİKLER ---
    const totalDebt = filteredDebts.reduce((acc, d) => acc + d.totalAmount, 0);
    const totalPaid = filteredDebts.reduce((acc, d) => acc + (d.paidAmount || 0), 0);
    const totalRemaining = totalDebt - totalPaid;

    const formatMoney = (amount: number) => {
        return amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";
    };

    const BAHCEMO_GREEN = "#1e703a";

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

                <button onClick={() => navigate(userRole === 'store_admin' ? `/stores/${userData?.storeId}` : '/')} className="btn btn-secondary">
                    ← Geri Dön
                </button>
            </div>

            {/* ÖZET KARTLARI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <SummaryCard title="Toplam Alacak" amount={totalDebt} color="#3498db" />
                <SummaryCard title="Tahsil Edilen" amount={totalPaid} color="#27ae60" />
                <SummaryCard title="Kalan Risk (Bakiye)" amount={totalRemaining} color="#e74c3c" isBold />
            </div>

            {/* FİLTRE VE ARAMA */}
            <div className="card" style={{ padding: '15px', marginBottom: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                    type="text"
                    placeholder="Müşteri Adı veya Fiş No Ara..."
                    style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd', minWidth: '200px' }}
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
                                border: '1px solid #eee',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                backgroundColor: filterStatus === status ? BAHCEMO_GREEN : 'white',
                                color: filterStatus === status ? 'white' : '#555',
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

            {/* MÜŞTERİ LİSTESİ (KARTLAR) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {loading ? <div>Yükleniyor...</div> : filteredDebts.map((debt) => (
                    <DebtCard key={debt.id} debt={debt} formatMoney={formatMoney} navigate={navigate} />
                ))}

                {!loading && filteredDebts.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#999', padding: '40px', width: '100%' }}>
                        Bu kriterlere uygun borç kaydı bulunamadı.
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
    // İlerleme yüzdesi (NaN kontrolü ile)
    const paid = debt.paidAmount || 0;
    const total = debt.totalAmount || 1; // Sıfıra bölünme hatası önlemi
    const percentage = Math.min(100, Math.max(0, (paid / total) * 100));

    // Renk belirleme
    let statusColor = '#e74c3c'; // Kırmızı (Ödenmedi)
    if (debt.status === 'Kısmi Ödeme') statusColor = '#f39c12'; // Turuncu
    if (debt.status === 'Ödendi') statusColor = '#27ae60'; // Yeşil

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
            style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}
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
                        onClick={() => navigate('/payments/add', {
                            state: {
                                preSelectedDebt: {
                                    saleId: debt.saleId,
                                    storeId: debt.storeId,
                                    customerName: debt.customerName,
                                    receiptNo: debt.receiptNo,
                                    remainingAmount: debt.remainingAmount
                                }
                            }
                        })}
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
                            gap: '6px' // İkon ile yazı arasındaki boşluk
                        }}
                    >
                        {/* 🔥 Emoji yerine dışarıdan gelen ikon eklendi */}
                        <img
                            src={cardIcon}
                            alt="Tahsilat"
                            style={{
                                width: '16px',
                                height: '16px',
                                // Eğer ikonunuz siyahsa ve mavi buton üzerinde beyaz görünmesini istiyorsanız alttaki satırı kullanın:
                                filter: 'brightness(0) invert(1)'
                            }}
                        />
                        Tahsilat
                    </button>
                )}
            </div>
        </motion.div>
    );
};

export default DebtList;