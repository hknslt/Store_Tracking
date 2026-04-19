// src/pages/finance/PersonnelCommissions.tsx
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getStores, getPersonnelByStore } from "../../services/storeService";
import { getMonthlySalesByPersonnel, updateStoreCommissionModel, updatePersonnelCommissionRate } from "../../services/commissionService";
import { getAllTargets, setStoreTarget as saveStoreTargetToDb } from "../../services/targetService";
import { useNavigate } from "react-router-dom";
import type { Store, Personnel, CommissionResult } from "../../types";
import "../../App.css";

// İkonlar
import EditIcon from "../../assets/icons/edit.svg";
import targetIcon from "../../assets/icons/target.svg";
import SaveIcon from "../../assets/icons/save.svg";
import CancelIcon from "../../assets/icons/close-circle.svg";

const PersonnelCommissions = () => {
    const { userRole, userData } = useAuth();
    const isAdmin = userRole === 'admin' || userRole === 'control';
    const navigate = useNavigate();

    // Veri Stateleri
    const [stores, setStores] = useState<Store[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState("");
    const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
    const [salesMap, setSalesMap] = useState<Record<string, number>>({});

    const [storeTarget, setStoreTarget] = useState<number>(0);

    // UI Stateleri
    const [results, setResults] = useState<CommissionResult[]>([]);
    const [storeTotalSales, setStoreTotalSales] = useState(0);
    const [currentModel, setCurrentModel] = useState<'target_based' | 'flat_rate'>('flat_rate');

    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
            if (!isAdmin && !userData?.storeId) {
                setLoading(false);
            }
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
            // Aktif sayfa olduğu için doğrudan bu ayı çeker
            const [salesData, personnelData, targetsData, storeData] = await Promise.all([
                getMonthlySalesByPersonnel(selectedStoreId),
                getPersonnelByStore(selectedStoreId),
                getAllTargets(),
                isAdmin ? Promise.resolve(stores.find(s => s.id === selectedStoreId)) : getStores().then(s => s.find(x => x.id === selectedStoreId))
            ]);

            setSalesMap(salesData);
            setPersonnelList(personnelData as Personnel[]);

            const targetObj = targetsData.find(t => t.storeId === selectedStoreId);
            setStoreTarget(targetObj ? targetObj.targetAmount : 0);

            setCurrentModel(storeData?.commissionModel || 'flat_rate');

            const total = Object.values(salesData).reduce((a, b) => a + b, 0);
            setStoreTotalSales(total);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        setIsEditing(false);
    }, [selectedStoreId]);

    useEffect(() => {
        if (!personnelList.length) {
            setResults([]);
            return;
        }

        const isTargetReached = storeTotalSales >= storeTarget;

        const computed: CommissionResult[] = personnelList.map(p => {
            const sales = salesMap[p.id!] || 0;
            const rate = p.commissionRate || 0;

            let isEligible = true;
            let amount = 0;

            if (currentModel === 'target_based') {
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

    }, [personnelList, salesMap, currentModel, storeTotalSales, storeTarget]);

    const handleRateChange = (personnelId: string, newRate: string) => {
        const updatedList = personnelList.map(p =>
            p.id === personnelId ? { ...p, commissionRate: Number(newRate) } : p
        );
        setPersonnelList(updatedList);
    };

    const handleCancel = () => {
        setIsEditing(false);
        fetchData();
        setMessage({ type: 'error', text: "Değişiklikler iptal edildi." });
    };

    const handleSaveAll = async () => {
        if (!selectedStoreId) return;
        setLoading(true);
        try {
            await updateStoreCommissionModel(selectedStoreId, currentModel);
            await saveStoreTargetToDb(selectedStoreId, Number(storeTarget));

            const updates = personnelList.map(p =>
                updatePersonnelCommissionRate(p.id!, p.commissionRate || 0)
            );
            await Promise.all(updates);

            setMessage({ type: 'success', text: "Tüm ayarlar başarıyla kaydedildi!" });
            setIsEditing(false);

        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: "Kaydetme sırasında hata oluştu." });
        } finally {
            setLoading(false);
        }
    };

    if (loading && !selectedStoreId && isAdmin) return <div className="page-container">Yükleniyor...</div>;

    return (
        <div className="page-container">
            {message && <div className={`toast-message ${message.type === 'success' ? 'toast-success' : 'toast-error'}`}>{message.text}</div>}

            <div className="page-header">
                <div className="page-title">
                    <h2>Aktif Personel Prim Takibi</h2>
                    <p>İçinde bulunduğumuz ayın güncel performansları</p>
                </div>

                {isAdmin && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {/* 🔥 YENİ EKLENEN BUTON: GEÇMİŞ PRİMLER */}
                        <button
                            onClick={() => navigate('/past-commissions')}
                            className="btn btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#3b82f6', color: '#fcfcfc', border: 'none' }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            Geçmiş Prim Analizi
                        </button>

                        <button
                            onClick={() => navigate('/targets')}
                            className="btn btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#145a32', color: '#fcfcfc', border: 'none' }}
                        >
                            <img src={targetIcon} width="16" style={{ filter: 'invert(1)' }} /> Mağaza Hedefleri
                        </button>

                        {selectedStoreId && (
                            !isEditing ? (
                                <button onClick={() => setIsEditing(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <img src={EditIcon} width="16" style={{ opacity: 0.6 }} /> Düzenle
                                </button>
                            ) : (
                                <>
                                    <button onClick={handleCancel} className="btn btn-secondary" style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <img src={CancelIcon} width="16" style={{ filter: 'invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg) brightness(104%) contrast(97%)' }} /> İptal
                                    </button>
                                    <button onClick={handleSaveAll} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <img src={SaveIcon} width="16" style={{ filter: 'invert(1)' }} /> Kaydet
                                    </button>
                                </>
                            )
                        )}
                    </div>
                )}
            </div>

            {isAdmin && (
                <div className="card" style={{ marginBottom: '20px', padding: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ fontWeight: 'bold' }}>Mağaza:</label>
                        <select
                            className="form-input"
                            style={{ maxWidth: '300px' }}
                            value={selectedStoreId}
                            onChange={e => setSelectedStoreId(e.target.value)}
                            disabled={isEditing}
                        >
                            <option value="">-- Seçiniz --</option>
                            {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                        </select>
                    </div>
                </div>
            )}

            {selectedStoreId ? (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#64748b', fontSize: '14px' }}>MAĞAZA HEDEF DURUMU (Bu Ay)</h4>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                                <div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>
                                        {storeTotalSales.toLocaleString('tr-TR')} ₺
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px' }}>
                                        Hedef:
                                        {isEditing ? (
                                            <input type="number" className="form-input" value={storeTarget} onChange={(e) => setStoreTarget(Number(e.target.value))} style={{ width: '100px', padding: '2px 5px', fontSize: '13px', fontWeight: 'bold', color: '#333' }} />
                                        ) : (
                                            <span style={{ fontWeight: 'bold' }}>{storeTarget.toLocaleString('tr-TR')} ₺</span>
                                        )}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    {storeTotalSales >= storeTarget ? (
                                        <span className="badge success" style={{ fontSize: '14px', padding: '8px 12px' }}>🎉 HEDEF TUTTU</span>
                                    ) : (
                                        <span className="badge danger" style={{ fontSize: '14px', padding: '8px 12px' }}>HEDEF ALTINDA</span>
                                    )}
                                </div>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', marginTop: '15px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min((storeTotalSales / (storeTarget || 1)) * 100, 100)}%`, height: '100%', background: storeTotalSales >= storeTarget ? '#10b981' : '#f59e0b', transition: 'width 0.5s ease' }}></div>
                            </div>
                        </div>

                        <div className="card" style={{ padding: '20px' }}>
                            <h4 style={{ margin: '0 0 15px 0', color: '#64748b', fontSize: '14px' }}>PRİM HESAPLAMA MODELİ</h4>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button disabled={!isEditing} onClick={() => setCurrentModel('target_based')} className={`btn ${currentModel === 'target_based' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, opacity: !isEditing && currentModel !== 'target_based' ? 0.5 : 1 }}>Hedef Odaklı</button>
                                <button disabled={!isEditing} onClick={() => setCurrentModel('flat_rate')} className={`btn ${currentModel === 'flat_rate' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, opacity: !isEditing && currentModel !== 'flat_rate' ? 0.5 : 1 }}>Hedefsiz (Düz)</button>
                            </div>
                            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '10px', lineHeight: '1.4' }}>
                                {currentModel === 'target_based' ? "Personel primi, mağaza toplam hedefi tutturursa verilir. Hedef tutmazsa kimse prim alamaz." : "Mağaza hedefinden bağımsız olarak, her personel kendi satış yüzdesi kadar prim alır."}
                            </p>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-body" style={{ padding: 0 }}>
                            <table className="data-table">
                                <thead>
                                    <tr style={{ background: '#f8f9fa' }}>
                                        <th style={{ width: '30%' }}>Personel</th>
                                        <th style={{ width: '25%', textAlign: 'right' }}>Toplam Satış</th>
                                        <th style={{ width: '20%', textAlign: 'center' }}>Prim Oranı (%)</th>
                                        <th style={{ width: '25%', textAlign: 'right' }}>Hakediş (TL)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map(r => (
                                        <tr key={r.personnelId} className="hover-row">
                                            <td style={{ fontWeight: '500' }}>{r.personnelName}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#334155' }}>{r.totalSales.toLocaleString('tr-TR')} ₺</td>
                                            <td style={{ textAlign: 'center' }}>
                                                {isEditing ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                                        <input type="number" value={personnelList.find(p => p.id === r.personnelId)?.commissionRate || 0} onChange={e => handleRateChange(r.personnelId, e.target.value)} className="form-input" style={{ width: '70px', textAlign: 'center', padding: '5px' }} />
                                                        <span style={{ color: '#666' }}>%</span>
                                                    </div>
                                                ) : (
                                                    <span className="badge neutral">%{r.commissionRate}</span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                {r.isEligible ? (
                                                    <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '15px' }}>+{r.commissionAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                                                ) : (
                                                    <span style={{ color: '#ef4444', fontSize: '13px', fontStyle: 'italic' }}>(Hedef Tutmadı)</span>
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

export default PersonnelCommissions;