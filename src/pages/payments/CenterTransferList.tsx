// src/pages/payments/CenterTransferList.tsx
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { getStores } from "../../services/storeService";
import { getCenterTransfers, saveBulkCenterTransferChecks, getPaymentMethods } from "../../services/paymentService";
import { useNavigate } from "react-router-dom";
import type { Store, SystemUser, PaymentMethod } from "../../types";
import "../../App.css";

import bankIcon from "../../assets/icons/bank.svg";
import checkIcon from "../../assets/icons/verify.svg";

// Transfer verisinin arayüzü (İç kullanım için)
interface TransferItem {
    paymentId: string;
    storeId: string;
    receiptNo: string;
    date: string;
    personnelName: string;
    itemIndex: number;
    amount: number;
    originalAmount: number;
    currency: string;
    description: string;
    paymentMethodId: string;
    isCenterChecked?: boolean;
}

const CenterTransferList = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // Veriler
    const [originalTransfers, setOriginalTransfers] = useState<TransferItem[]>([]);
    const [transfers, setTransfers] = useState<TransferItem[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [methods, setMethods] = useState<PaymentMethod[]>([]);

    // Roller & Durum
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    //   MESAJ YÖNETİMİ
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Değişen kayıtları takip etmek için (Kaydet butonuna basıldığında bunları göndereceğiz)
    const [pendingChanges, setPendingChanges] = useState<{ paymentId: string, itemIndex: number, isCenterChecked: boolean }[]>([]);

    // Filtreler
    const [filterStoreId, setFilterStoreId] = useState("");
    const [filterStatus, setFilterStatus] = useState<"all" | "approved" | "pending">("all");

    // Sıralama
    const [sortConfig, setSortConfig] = useState<{ key: keyof TransferItem, direction: 'asc' | 'desc' }>({
        key: 'date',
        direction: 'desc'
    });

    // Mesajları otomatik kapatma efekti
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    useEffect(() => {
        const init = async () => {
            if (!currentUser) return;
            try {
                const sData = await getStores();
                setStores(sData);

                const mData = await getPaymentMethods();
                setMethods(mData);

                let uData = null;
                const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                if (userDoc.exists()) uData = userDoc.data() as SystemUser;
                else {
                    const pDoc = await getDoc(doc(db, "personnel", currentUser.uid));
                    if (pDoc.exists()) uData = pDoc.data() as SystemUser;
                }

                if (uData) {
                    const hasAdminAccess = ['admin', 'control', 'report'].includes(uData.role);
                    setIsAdmin(hasAdminAccess);

                    if (!hasAdminAccess && uData.storeId) {
                        setFilterStoreId(uData.storeId);
                    }

                    const data = await getCenterTransfers(hasAdminAccess ? undefined : uData.storeId);
                    setOriginalTransfers(data);
                    setTransfers(data);
                }
            } catch (error) {
                console.error(error);
                setMessage({ type: 'error', text: 'Veriler yüklenirken bir hata oluştu.' });
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [currentUser]);

    // Tik değiştirme (Sadece State günceller, veritabanına gitmez)
    const handleToggleCheck = (paymentId: string, itemIndex: number, currentStatus: boolean) => {
        if (!isAdmin) return;

        const newStatus = !currentStatus;

        // Ekranda gösterilen listeyi güncelle
        setTransfers(prev => prev.map(t =>
            t.paymentId === paymentId && t.itemIndex === itemIndex
                ? { ...t, isCenterChecked: newStatus }
                : t
        ));

        // Değişiklik havuzuna (pendingChanges) ekle veya güncelle
        setPendingChanges(prev => {
            const existingIndex = prev.findIndex(p => p.paymentId === paymentId && p.itemIndex === itemIndex);

            // Veritabanındaki orijinal haliyle aynı duruma gelirse (Tikledi sonra geri aldı) değişiklik havuzundan çıkar
            const originalItem = originalTransfers.find(o => o.paymentId === paymentId && o.itemIndex === itemIndex);
            if (originalItem && !!originalItem.isCenterChecked === newStatus) {
                if (existingIndex > -1) {
                    const newArray = [...prev];
                    newArray.splice(existingIndex, 1);
                    return newArray;
                }
                return prev;
            }

            if (existingIndex > -1) {
                const newArray = [...prev];
                newArray[existingIndex].isCenterChecked = newStatus;
                return newArray;
            } else {
                return [...prev, { paymentId, itemIndex, isCenterChecked: newStatus }];
            }
        });
    };

    // DEĞİŞİKLİKLERİ KAYDET
    const handleSaveChanges = async () => {
        if (pendingChanges.length === 0) return;

        setSaving(true);
        try {
            await saveBulkCenterTransferChecks(pendingChanges);
            // Başarılı olursa orijinal listeyi şu anki listeye eşitle
            setOriginalTransfers([...transfers]);
            setPendingChanges([]);
            setMessage({ type: 'success', text: 'Değişiklikler başarıyla kaydedildi!' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Kayıt sırasında bir hata oluştu.' });
        } finally {
            setSaving(false);
        }
    };

    // FİLTRELEME VE SIRALAMA MANTIĞI
    const getProcessedTransfers = () => {
        // 1. Filtreleme
        let filtered = transfers.filter(t => {
            const storeMatch = filterStoreId ? t.storeId === filterStoreId : true;
            const statusMatch = filterStatus === 'all' ? true :
                filterStatus === 'approved' ? !!t.isCenterChecked :
                    !t.isCenterChecked; // pending
            return storeMatch && statusMatch;
        });

        // 2. Sıralama
        filtered.sort((a, b) => {
            let valA: any = a[sortConfig.key];
            let valB: any = b[sortConfig.key];

            // Mağaza ismine göre sıralama için ID'den isme dönüştür
            if (sortConfig.key === 'storeId') {
                valA = getStoreName(a.storeId);
                valB = getStoreName(b.storeId);
            }

            if (sortConfig.key === 'date') {
                valA = new Date(a.date).getTime();
                valB = new Date(b.date).getTime();
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    };

    const requestSort = (key: keyof TransferItem) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const SortableHeader = ({ label, sortKey, align = 'left', width }: { label: string, sortKey: keyof TransferItem, align?: string, width?: string }) => (
        <th
            onClick={() => requestSort(sortKey)}
            style={{ textAlign: align as any, cursor: 'pointer', userSelect: 'none', width: width }}
            title="Sıralamak için tıklayın"
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start' }}>
                {label}
                {sortConfig.key === sortKey && (
                    <span style={{ fontSize: '10px', color: '#3b82f6', opacity: 0.8 }}>
                        {sortConfig.direction === 'asc' ? '▲' : '▼'}
                    </span>
                )}
            </div>
        </th>
    );

    // Yardımcı fonksiyonlar
    const getStoreName = (id: string) => stores.find(s => s.id === id)?.storeName || "Bilinmiyor";
    const getMethodName = (id: string) => methods.find(m => m.id === id)?.name || "-";
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('tr-TR');

    const processedTransfers = getProcessedTransfers();

    if (loading) return <div className="page-container" style={{ textAlign: 'center', paddingTop: '100px' }}>Yükleniyor...</div>;

    return (
        <div className="page-container">

            {/*   TOAST MESAJI */}
            {message && (
                <div style={{
                    position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
                    padding: '15px 25px', borderRadius: '8px', color: 'white', fontWeight: '600',
                    backgroundColor: message.type === 'success' ? '#10b981' : '#ef4444',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', animation: 'fadeIn 0.3s'
                }}>
                    {message.text}
                </div>
            )}

            {/* ÜST BİLGİ VE KAYDET BUTONU */}
            <div className="modern-header" style={{ marginBottom: '20px' }}>
                <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={bankIcon} alt="Banka" width="24" style={{ filter: 'brightness(0) saturate(100%) invert(35%) sepia(87%) saturate(836%) hue-rotate(354deg) brightness(95%) contrast(94%)' }} />
                        Merkez Transfer Kontrolü
                    </h2>
                    <p style={{ color: '#64748b' }}>
                        {isAdmin ? "Mağazalardan merkeze yapılan transferleri onaylayın." : "Merkeze yapılan transferlerinizin durumu."}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => navigate('/payments/list')} className="modern-btn btn-secondary">
                        ← Kasa Hareketleri
                    </button>
                    {isAdmin && pendingChanges.length > 0 && (
                        <button onClick={handleSaveChanges} disabled={saving} className="modern-btn btn-primary" style={{ backgroundColor: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <img src={checkIcon} alt="Kaydet" width="16" style={{ filter: 'brightness(0) invert(1)' }} />
                            {saving ? "Kaydediliyor..." : `Değişiklikleri Kaydet (${pendingChanges.length})`}
                        </button>
                    )}
                </div>
            </div>

            {/* FİLTRELEME ALANI */}
            <div className="card" style={{ padding: '15px 20px', marginBottom: '20px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    {isAdmin && (
                        <div style={{ minWidth: '200px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '5px' }}>Mağaza Filtresi</label>
                            <select
                                className="form-input"
                                value={filterStoreId}
                                onChange={e => setFilterStoreId(e.target.value)}
                                style={{ width: '100%', padding: '8px' }}
                            >
                                <option value="">Tüm Mağazalar</option>
                                {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                            </select>
                        </div>
                    )}

                    <div style={{ minWidth: '200px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '5px' }}>Onay Durumu</label>
                        <select
                            className="form-input"
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value as any)}
                            style={{ width: '100%', padding: '8px' }}
                        >
                            <option value="all">Tümü</option>
                            <option value="pending">⏳ Onay Bekleyenler</option>
                            <option value="approved">✅ Onaylananlar</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* LİSTE */}
            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    <table className="modern-table">
                        <thead>
                            <tr style={{ backgroundColor: '#f1f5f9' }}>
                                {isAdmin && <SortableHeader label="Mağaza" sortKey="storeId" />}
                                <SortableHeader label="Tarih" sortKey="date" />
                                <SortableHeader label="Makbuz No" sortKey="receiptNo" />
                                <SortableHeader label="İşlemi Yapan" sortKey="personnelName" />
                                <th>Açıklama / Yöntem</th>
                                <th style={{ textAlign: 'right' }}>Döviz</th>
                                <SortableHeader label="TL Tutarı" sortKey="amount" align="right" />
                                <th style={{ textAlign: 'center', width: '100px' }}>Merkez Onayı</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedTransfers.length > 0 ? (
                                processedTransfers.map((t) => {
                                    // Değişiklik yapılmışsa satır arka planını sarımsı yap (Kaydedilmediğini belirtsin)
                                    const isChanged = pendingChanges.some(p => p.paymentId === t.paymentId && p.itemIndex === t.itemIndex);

                                    return (
                                        <tr key={`${t.paymentId}-${t.itemIndex}`} style={{
                                            borderBottom: '1px solid #e2e8f0',
                                            backgroundColor: isChanged ? '#fef3c7' : (t.isCenterChecked ? '#f0fdf4' : 'white')
                                        }}>
                                            {isAdmin && <td style={{ fontWeight: '600', color: '#334155' }}>{getStoreName(t.storeId)}</td>}
                                            <td style={{ color: '#64748b' }}>{formatDate(t.date)}</td>
                                            <td style={{ fontWeight: '700' }}>{t.receiptNo}</td>
                                            <td>{t.personnelName}</td>
                                            <td style={{ fontSize: '12px' }}>
                                                <span style={{ color: '#64748b', fontStyle: 'italic' }}>{t.description || "Transfer"}</span>
                                                <br />
                                                <span style={{ fontWeight: 'bold', color: '#475569' }}>({getMethodName(t.paymentMethodId)})</span>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: '500' }}>
                                                {t.currency !== 'TL' ? `${t.originalAmount} ${t.currency}` : '-'}
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: '800', color: '#ef4444' }}>
                                                {Number(t.amount).toLocaleString('tr-TR')} ₺
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <label style={{ display: 'inline-flex', alignItems: 'center', cursor: isAdmin ? 'pointer' : 'not-allowed' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={!!t.isCenterChecked}
                                                        onChange={() => handleToggleCheck(t.paymentId, t.itemIndex, !!t.isCenterChecked)}
                                                        disabled={!isAdmin}
                                                        style={{ width: '22px', height: '22px', cursor: isAdmin ? 'pointer' : 'not-allowed', accentColor: '#10b981' }}
                                                    />
                                                </label>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={isAdmin ? 8 : 7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                        Merkeze transfer işlemi bulunamadı.
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

export default CenterTransferList;