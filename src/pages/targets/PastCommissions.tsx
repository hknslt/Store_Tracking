// src/pages/finance/PastCommissions.tsx
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getStores, getPersonnelByStore } from "../../services/storeService";
import { getMonthlySalesByPersonnel, getPastCommissionRecord, savePastCommissionRecord } from "../../services/commissionService";
import { useNavigate } from "react-router-dom";
import { exportCommissionsToExcel } from "../../utils/excelExport";
import type { Store, Personnel, CommissionResult } from "../../types";
import "../../App.css";

import SaveIcon from "../../assets/icons/save.svg";

const PastCommissions = () => {
    const { userRole, userData } = useAuth();
    const isAdmin = userRole === 'admin' || userRole === 'control';
    const navigate = useNavigate();

    const [stores, setStores] = useState<Store[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState("");
    const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
    const [salesMap, setSalesMap] = useState<Record<string, number>>({});

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [selectedYear, setSelectedYear] = useState<number>(currentYear);
    const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

    // SİMÜLASYON STATELERİ (Sadece bu ekranda geçerli)
    const [simulatedTarget, setSimulatedTarget] = useState<number>(0);
    const [simulatedModel, setSimulatedModel] = useState<'target_based' | 'flat_rate'>('flat_rate');
    const [simulatedRates, setSimulatedRates] = useState<Record<string, number>>({});

    const [results, setResults] = useState<CommissionResult[]>([]);
    const [storeTotalSales, setStoreTotalSales] = useState(0);

    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    const years = Array.from(new Array(5), (_, index) => currentYear - index);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    useEffect(() => {
        const loadBase = async () => {
            if (isAdmin) {
                const s = await getStores();
                setStores(s);
            } else if (userData?.storeId) {
                setSelectedStoreId(userData.storeId);
            }
            if (!isAdmin && !userData?.storeId) setLoading(false);
        };
        loadBase();
    }, [isAdmin, userData]);

    const fetchData = async () => {
        if (!selectedStoreId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const [salesData, personnelData, pastRecord] = await Promise.all([
                getMonthlySalesByPersonnel(selectedStoreId, selectedYear, selectedMonth),
                getPersonnelByStore(selectedStoreId),
                getPastCommissionRecord(selectedStoreId, selectedYear, selectedMonth)
            ]);

            setSalesMap(salesData);
            setPersonnelList(personnelData as Personnel[]);

            const total = Object.values(salesData).reduce((a, b) => a + b, 0);
            setStoreTotalSales(total);

            // EĞER GEÇMİŞTE BU AYA AİT BİR KAYIT YAPILMIŞSA ONU YÜKLE
            if (pastRecord) {
                setSimulatedTarget(pastRecord.targetAmount || 0);
                setSimulatedModel(pastRecord.commissionModel || 'flat_rate');
                setSimulatedRates(pastRecord.personnelRates || {});
            } else {
                // YOKSA SIFIRDAN BAŞLA (Personellerin güncel oranlarını varsayılan olarak al)
                setSimulatedTarget(0);
                setSimulatedModel('flat_rate');
                const initialRates: Record<string, number> = {};
                (personnelData as Personnel[]).forEach(p => {
                    initialRates[p.id!] = p.commissionRate || 0;
                });
                setSimulatedRates(initialRates);
            }

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedStoreId, selectedYear, selectedMonth]);

    // HESAPLAMA MOTORU (Anlık Simülasyon)
    useEffect(() => {
        if (!personnelList.length) {
            setResults([]);
            return;
        }

        const isTargetReached = storeTotalSales >= simulatedTarget;

        const computed: CommissionResult[] = personnelList.map(p => {
            const sales = salesMap[p.id!] || 0;
            const rate = simulatedRates[p.id!] || 0;

            let isEligible = true;
            let amount = 0;

            if (simulatedModel === 'target_based') {
                if (!isTargetReached) {
                    isEligible = false;
                    amount = 0;
                } else {
                    amount = (sales * rate) / 100;
                }
            } else {
                amount = (sales * rate) / 100;
            }

            return { personnelId: p.id!, personnelName: p.fullName, totalSales: sales, commissionRate: rate, commissionAmount: amount, isEligible: isEligible };
        });

        setResults(computed);

    }, [personnelList, salesMap, simulatedModel, storeTotalSales, simulatedTarget, simulatedRates]);


    const handleRateChange = (personnelId: string, newRate: string) => {
        setSimulatedRates(prev => ({ ...prev, [personnelId]: Number(newRate) }));
    };

    const handleSaveSnapshot = async () => {
        if (!selectedStoreId) return;
        setLoading(true);
        try {
            const dataToSave = {
                targetAmount: simulatedTarget,
                commissionModel: simulatedModel,
                personnelRates: simulatedRates,
                totalSalesSnapshot: storeTotalSales // O anki ciroyu da kanıt olarak kaydediyoruz
            };

            await savePastCommissionRecord(selectedStoreId, selectedYear, selectedMonth, dataToSave);
            setMessage({ type: 'success', text: "Bu aya ait analiz başarıyla arşive kaydedildi!" });
        } catch (error) {
            setMessage({ type: 'error', text: "Kaydetme sırasında hata oluştu." });
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        const storeName = stores.find(s => s.id === selectedStoreId)?.storeName || "Mağaza";
        exportCommissionsToExcel(results, storeName, selectedYear, selectedMonth, storeTotalSales, simulatedTarget);
    };

    if (loading && !selectedStoreId && isAdmin) return <div className="page-container">Yükleniyor...</div>;

    return (
        <div className="page-container">
            {message && <div className={`toast-message ${message.type === 'success' ? 'toast-success' : 'toast-error'}`}>{message.text}</div>}

            <div className="page-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
                <div className="page-title">
                    <h2 style={{ color: '#2563eb' }}>Geçmiş Prim Analizi & Simülasyon</h2>
                    <p>Geçmiş ayların prim hesaplamalarını yapın ve arşivleyin.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handleExport} className="btn btn-secondary" style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', fontWeight: 'bold' }}>
                        Excel İndir
                    </button>
                    <button onClick={() => navigate('/commissions')} className="btn btn-secondary">
                        ← Aktif Primlere Dön
                    </button>
                </div>
            </div>

            {/* FİLTRE VE TARİH SEÇİCİ */}
            {(isAdmin || selectedStoreId) && (
                <div className="card" style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                        {isAdmin && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <label style={{ fontWeight: 'bold', fontSize: '13px', color: '#1e3a8a' }}>Mağaza:</label>
                                <select className="form-input" style={{ maxWidth: '250px' }} value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)}>
                                    <option value="">-- Seçiniz --</option>
                                    {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                                </select>
                            </div>
                        )}
                        <div style={{ borderLeft: '1px solid #bfdbfe', height: '30px' }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <label style={{ fontWeight: 'bold', fontSize: '13px', color: '#1e3a8a' }}>Dönem (Ay/Yıl):</label>
                            <select className="form-input" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} style={{ width: '120px' }}>
                                {monthNames.map((m, idx) => <option key={idx} value={idx + 1}>{m}</option>)}
                            </select>
                            <select className="form-input" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={{ width: '100px' }}>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {selectedStoreId ? (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                        {/* 1. KART: SİMÜLE EDİLEN MAĞAZA DURUMU */}
                        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#64748b', fontSize: '14px' }}>
                                SİMÜLE EDİLEN HEDEF DURUMU <span style={{ color: '#3b82f6' }}>({monthNames[selectedMonth - 1]} {selectedYear})</span>
                            </h4>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                                <div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>
                                        {storeTotalSales.toLocaleString('tr-TR')} ₺ <span style={{ fontSize: '12px', color: '#94a3b8' }}>(Gerçekleşen Ciro)</span>
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '10px' }}>
                                        Hedef:
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={simulatedTarget}
                                            onChange={(e) => setSimulatedTarget(Number(e.target.value))}
                                            style={{ width: '120px', padding: '4px 8px', fontSize: '14px', fontWeight: 'bold', color: '#ea580c', border: '1px solid #ea580c' }}
                                        /> ₺
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    {storeTotalSales >= simulatedTarget ? (
                                        <span className="badge success" style={{ fontSize: '14px', padding: '8px 12px' }}>🎉 HEDEF TUTTU</span>
                                    ) : (
                                        <span className="badge danger" style={{ fontSize: '14px', padding: '8px 12px' }}>HEDEF ALTINDA</span>
                                    )}
                                </div>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', marginTop: '15px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min((storeTotalSales / (simulatedTarget || 1)) * 100, 100)}%`, height: '100%', background: storeTotalSales >= simulatedTarget ? '#10b981' : '#f59e0b', transition: 'width 0.5s ease' }}></div>
                            </div>
                        </div>

                        {/* 2. KART: MODEL */}
                        <div className="card" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <h4 style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>SİMÜLE EDİLEN MODEL</h4>
                                <button onClick={handleSaveSnapshot} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <img src={SaveIcon} width="14" style={{ filter: 'invert(1)' }} /> Arşive Kaydet
                                </button>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => setSimulatedModel('target_based')} className={`btn ${simulatedModel === 'target_based' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }}>Hedef Odaklı</button>
                                <button onClick={() => setSimulatedModel('flat_rate')} className={`btn ${simulatedModel === 'flat_rate' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }}>Hedefsiz (Düz)</button>
                            </div>
                            <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '10px', fontStyle: 'italic' }}>
                                * Burada yapılan değişiklikler güncel aktif prim sistemini etkilemez. Sadece seçili ay için hesaplama ve arşivleme yapar.
                            </p>
                        </div>
                    </div>

                    {/* LİSTE */}
                    <div className="card">
                        <div className="card-body" style={{ padding: 0 }}>
                            <table className="data-table">
                                <thead>
                                    <tr style={{ background: '#f8f9fa' }}>
                                        <th style={{ width: '30%' }}>Personel</th>
                                        <th style={{ width: '25%', textAlign: 'right' }}>Toplam Satış</th>
                                        <th style={{ width: '20%', textAlign: 'center' }}>Prim Oranı (%)</th>
                                        <th style={{ width: '25%', textAlign: 'right' }}>Hesaplanan Hakediş</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map(r => (
                                        <tr key={r.personnelId} className="hover-row">
                                            <td style={{ fontWeight: '500' }}>{r.personnelName}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#334155' }}>
                                                {r.totalSales.toLocaleString('tr-TR')} ₺
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                                    <input
                                                        type="number"
                                                        value={simulatedRates[r.personnelId] || 0}
                                                        onChange={e => handleRateChange(r.personnelId, e.target.value)}
                                                        className="form-input"
                                                        style={{ width: '70px', textAlign: 'center', padding: '5px', border: '1px solid #3b82f6' }}
                                                    />
                                                    <span style={{ color: '#666' }}>%</span>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                {r.isEligible ? (
                                                    <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '16px' }}>
                                                        +{r.commissionAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#ef4444', fontSize: '13px', fontStyle: 'italic' }}>
                                                        (Hedef Tutmadı)
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {results.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#999' }}>Personel verisi bulunamadı.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div style={{ textAlign: 'center', padding: '50px', color: '#95a5a6' }}>
                    <p>Lütfen bir mağaza seçiniz.</p>
                </div>
            )}
        </div>
    );
};

export default PastCommissions;