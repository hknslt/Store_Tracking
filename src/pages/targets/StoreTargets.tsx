// src/pages/targets/StoreTargets.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getStores } from "../../services/storeService";
import { getAllTargets, setStoreTarget } from "../../services/targetService";
import type { Store } from "../../types";
import "../../App.css";

// İkonlar
import EditIcon from "../../assets/icons/edit.svg";
import SaveIcon from "../../assets/icons/save.svg";
import CancelIcon from "../../assets/icons/close-circle.svg";

const StoreTargets = () => {
    const { userRole } = useAuth();
    const navigate = useNavigate();

    // Veri Stateleri
    const [stores, setStores] = useState<Store[]>([]);
    const [targets, setTargets] = useState<Record<string, number>>({}); // Anlık düzenlenmiş veriler
    const [initialTargets, setInitialTargets] = useState<Record<string, number>>({}); // Yedek (İptal için)

    // UI Stateleri
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Otomatik mesaj gizleme
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    // Yetki Kontrolü ve Veri Çekme
    useEffect(() => {
        if (userRole && userRole !== 'admin' && userRole !== 'control') {
            navigate("/");
            return;
        }
        loadData();
    }, [userRole, navigate]);

    const loadData = async () => {
        try {
            const [storesData, targetsData] = await Promise.all([
                getStores(),
                getAllTargets()
            ]);

            setStores(storesData);

            // Hedefleri objeye çevir
            const targetMap: Record<string, number> = {};
            targetsData.forEach(t => {
                targetMap[t.storeId] = t.targetAmount;
            });

            setTargets(targetMap);
            setInitialTargets(targetMap); // Yedeği al

        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: "Veriler yüklenirken hata oluştu." });
        } finally {
            setLoading(false);
        }
    };

    // Input değişince state güncelle
    const handleInputChange = (storeId: string, val: string) => {
        setTargets(prev => ({
            ...prev,
            [storeId]: Number(val)
        }));
    };

    // İptal Butonu
    const handleCancel = () => {
        setTargets(initialTargets); // Eski veriyi geri yükle
        setIsEditing(false);
        setMessage({ type: 'error', text: "Değişiklikler iptal edildi." });
    };

    // Toplu Kaydetme İşlemi
    const handleSaveAll = async () => {
        setLoading(true);
        try {
            // Tüm mağazalar için kayıt işlemini paralel başlat
            const promises = stores.map(store => {
                const amount = targets[store.id!] || 0;
                return setStoreTarget(store.id!, amount);
            });

            await Promise.all(promises);

            setInitialTargets(targets); // Yeni yedeği güncelle
            setIsEditing(false);
            setMessage({ type: 'success', text: "Tüm hedefler başarıyla güncellendi." });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: "Kayıt sırasında bir hata oluştu." });
        } finally {
            setLoading(false);
        }
    };

    if (loading && !stores.length) return <div className="page-container">Yükleniyor...</div>;

    return (
        <div className="page-container">
            {message && (
                <div style={{
                    position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
                    padding: '15px 25px', borderRadius: '8px', color: 'white',
                    fontWeight: '600', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    backgroundColor: message.type === 'success' ? '#10b981' : '#ef4444',
                    animation: 'fadeIn 0.3s ease-in-out'
                }}>
                    {message.type === 'success' ? '✅' : '⚠️'} {message.text}
                </div>
            )}

            <div className="page-header">
                <div className="page-title">
                    <h2>Mağaza Hedefleri (KPI)</h2>
                    <p>Aylık ciro hedeflerini belirleyin</p>
                </div>

                {/* DÜZENLE / KAYDET BUTONLARI */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="btn btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                            <img src={EditIcon} width="16" style={{ opacity: 0.6 }} /> Düzenle
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={handleCancel}
                                className="btn btn-secondary"
                                style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}
                            >
                                <img src={CancelIcon} width="16" style={{ filter: 'invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg) brightness(104%) contrast(97%)' }} /> İptal
                            </button>
                            <button
                                onClick={handleSaveAll}
                                className="btn btn-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                                disabled={loading}
                            >
                                {loading ? 'Kaydediliyor...' : (
                                    <><img src={SaveIcon} width="16" style={{ filter: 'invert(1)' }} /> Kaydet</>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    <table className="data-table">
                        <thead>
                            <tr style={{ backgroundColor: '#f8f9fa' }}>
                                <th style={{ width: '50%' }}>Mağaza Adı</th>
                                <th style={{ width: '50%', textAlign: 'right' }}>Aylık Hedef (TL)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stores.map(store => (
                                <tr key={store.id} className="hover-row">
                                    <td style={{ fontWeight: '600', color: '#2c3e50' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '36px', height: '36px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px' }}>
                                                {store.storeName.charAt(0)}
                                            </div>
                                            {store.storeName}
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={targets[store.id!] || 0}
                                                onChange={(e) => handleInputChange(store.id!, e.target.value)}
                                                style={{ fontWeight: 'bold', color: '#16a34a', maxWidth: '200px', textAlign: 'right' }}
                                                autoFocus={store === stores[0]} // İlkine odaklan
                                            />
                                        ) : (
                                            <span style={{
                                                fontSize: '16px',
                                                fontWeight: 'bold',
                                                color: (targets[store.id!] || 0) > 0 ? '#16a34a' : '#94a3b8',
                                                backgroundColor: '#f8fafc',
                                                padding: '8px 15px',
                                                borderRadius: '6px',
                                                border: '1px solid #e2e8f0'
                                            }}>
                                                {(targets[store.id!] || 0).toLocaleString('tr-TR')} ₺
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {stores.length === 0 && (
                                <tr>
                                    <td colSpan={2} style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
                                        Kayıtlı mağaza bulunamadı.
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

export default StoreTargets;