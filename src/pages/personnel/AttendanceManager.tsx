// src/pages/personnel/AttendanceManager.tsx
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { getStores } from "../../services/storeService";
import { getMonthlyAttendance, saveBulkAttendance } from "../../services/attendanceService";

import type { Store, Personnel, AttendanceType, SystemUser } from "../../types";
import "../../App.css";

// Puantaj Verisi Yapısı
type AttendanceMap = Record<string, AttendanceType>;

const AttendanceManager = () => {
    const { currentUser } = useAuth();

    // State'ler
    const [stores, setStores] = useState<Store[]>([]);
    const [personnelList, setPersonnelList] = useState<Personnel[]>([]);

    const [localMap, setLocalMap] = useState<AttendanceMap>({});
    const [originalMap, setOriginalMap] = useState<AttendanceMap>({});

    const [selectedStoreId, setSelectedStoreId] = useState("");

    // Tarih Seçimi
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

    const [isAdmin, setIsAdmin] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [loading, setLoading] = useState(false);

    // 🔥 Kendi Mesaj Sistemimiz
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);

    // Otomatik Mesaj Kapatma
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    // Ayın günleri
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // --- BAŞLANGIÇ ---
    useEffect(() => {
        const init = async () => {
            if (!currentUser) return;
            const sData = await getStores();
            setStores(sData);

            // Önce 'users' tablosuna bakıyoruz (Yeni sistem)
            let userDoc = await getDoc(doc(db, "users", currentUser.uid));
            let uData = userDoc.exists() ? userDoc.data() as SystemUser : null;

            // Yoksa eski 'personnel' tablosuna bak
            if (!uData) {
                userDoc = await getDoc(doc(db, "personnel", currentUser.uid));
                if (userDoc.exists()) uData = userDoc.data() as SystemUser;
            }

            if (uData) {
                if (['admin', 'control', 'report'].includes(uData.role)) {
                    setIsAdmin(true);
                } else {
                    setIsAdmin(false);
                    if (uData.storeId) setSelectedStoreId(uData.storeId);
                }
            }
        };
        init();
    }, [currentUser]);

    // --- VERİLERİ YÜKLE ---
    const loadData = async () => {
        if (!selectedStoreId) {
            setPersonnelList([]);
            setLocalMap({});
            setOriginalMap({});
            return;
        }

        setLoading(true);
        try {
            const pQuery = query(collection(db, "personnel"), where("storeId", "==", selectedStoreId), where("isActive", "==", true));
            const pSnap = await getDocs(pQuery);
            const pData = pSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Personnel[];
            setPersonnelList(pData);

            const monthlyData = await getMonthlyAttendance(selectedStoreId, selectedYear, selectedMonth);

            if (monthlyData && monthlyData.records) {
                setLocalMap(monthlyData.records);
                setOriginalMap(monthlyData.records);
            } else {
                setLocalMap({});
                setOriginalMap({});
            }
            setHasChanges(false);

        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: "Veriler yüklenirken hata oluştu." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [selectedStoreId, selectedMonth, selectedYear]);

    // --- HÜCRE TIKLAMA (DÜZENLEME) ---
    const cycleStatus = (personnelId: string, day: number) => {
        const key = `${personnelId}_${String(day).padStart(2, '0')}`;

        // KİLİT KONTROLÜ: Eğer bu kayıt veritabanında zaten varsa değiştirilemez.
        if (originalMap[key]) {
            setMessage({ type: 'warning', text: "🔒 Kaydedilmiş (eski) puantaj kayıtları değiştirilemez!" });
            return;
        }

        const currentType = localMap[key];

        // Döngü: Boş -> Geldi -> Haftalık -> Yıllık -> Raporlu -> Ücretsiz -> Boş
        let nextType: AttendanceType | undefined = undefined;

        if (!currentType) nextType = 'Geldi';
        else if (currentType === 'Geldi') nextType = 'Haftalık İzin';
        else if (currentType === 'Haftalık İzin') nextType = 'Yıllık İzin';
        else if (currentType === 'Yıllık İzin') nextType = 'Raporlu';
        else if (currentType === 'Raporlu') nextType = 'Ücretsiz İzin';
        else nextType = undefined; // Sil (Boş)

        const newMap = { ...localMap };
        if (nextType) newMap[key] = nextType;
        else delete newMap[key];

        setLocalMap(newMap);
        setHasChanges(true);
    };

    // --- KAYDETME ---
    const handleSave = async () => {
        if (!hasChanges) return;
        setLoading(true);
        try {
            await saveBulkAttendance(selectedStoreId, selectedYear, selectedMonth, localMap);
            setOriginalMap(localMap); // Başarılı kayıttan sonra local veriyi original yap (artık kilitli olur)
            setHasChanges(false);
            setMessage({ type: 'success', text: "Puantaj başarıyla kaydedildi!" });
        } catch (error) {
            setMessage({ type: 'error', text: "Kayıt sırasında hata oluştu!" });
        } finally {
            setLoading(false);
        }
    };

    // --- ÖZET HESAPLAMA ---
    const calculateSummary = (personId: string) => {
        const summary = { geldi: 0, raporlu: 0, ucretsiz: 0, haftalik: 0, yillik: 0 };
        Object.entries(localMap).forEach(([key, type]) => {
            if (key.startsWith(personId + '_')) {
                if (type === 'Geldi') summary.geldi++;
                else if (type === 'Raporlu') summary.raporlu++;
                else if (type === 'Ücretsiz İzin') summary.ucretsiz++;
                else if (type === 'Haftalık İzin') summary.haftalik++;
                else if (type === 'Yıllık İzin') summary.yillik++;
            }
        });
        return summary;
    };

    // RENK AYARLARI
    const getCellContent = (type?: AttendanceType) => {
        switch (type) {
            case 'Geldi': return { text: '✔', bg: '#2ecc71', color: 'white' };       // Yeşil
            case 'Haftalık İzin': return { text: 'H', bg: '#3498db', color: 'white' }; // Mavi
            case 'Yıllık İzin': return { text: 'Y', bg: '#e67e22', color: 'white' };   // Turuncu
            case 'Raporlu': return { text: 'R', bg: '#f1c40f', color: 'black' };       // Sarı
            case 'Ücretsiz İzin': return { text: 'Ü', bg: '#e74c3c', color: 'white' }; // Kırmızı
            default: return { text: '', bg: 'white', color: 'black' };
        }
    };

    const yearOptions = Array.from({ length: 11 }, (_, i) => 2026 + i);

    return (
        <div className="page-container">
            {/* TOAST MESAJI */}
            {message && (
                <div style={{
                    position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
                    padding: '15px 25px', borderRadius: '8px', color: 'white',
                    fontWeight: '600', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    backgroundColor: message.type === 'success' ? '#10b981' : message.type === 'warning' ? '#f59e0b' : '#ef4444',
                    animation: 'fadeIn 0.3s ease-in-out'
                }}>
                    {message.type === 'success' ? '✅' : message.type === 'warning' ? '⚠️' : '❌'} {message.text}
                </div>
            )}

            <div className="page-header">
                <div className="page-title">
                    <h2>Personel Puantaj</h2>
                    <p style={{ color: '#64748b' }}>Çalışanların günlük devam durumunu işaretleyin.</p>
                </div>
                {hasChanges && (
                    <button onClick={handleSave} disabled={loading} className="modern-btn btn-primary" style={{ backgroundColor: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {loading ? 'Kaydediliyor...' : 'DEĞİŞİKLİKLERİ KAYDET'}
                    </button>
                )}
            </div>

            <div className="card" style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Yıl</label>
                        <select className="form-input" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={{ width: '120px', padding: '8px' }}>
                            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Ay</label>
                        <select className="form-input" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} style={{ width: '160px', padding: '8px' }}>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('tr-TR', { month: 'long' })}</option>
                            ))}
                        </select>
                    </div>
                    {isAdmin && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, maxWidth: '300px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Mağaza Seçimi</label>
                            <select className="form-input" value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)} style={{ width: '100%', padding: '8px' }}>
                                <option value="">-- Mağaza Seç --</option>
                                {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>Veriler Yükleniyor...</div>
            ) : selectedStoreId && personnelList.length > 0 ? (
                <div className="card" style={{ marginBottom: '15px' }}>
                    <div className="card-header" style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '12px 20px' }}>
                        <h3 className="card-title" style={{ fontSize: '15px', color: '#334155', margin: 0 }}>📊 {new Date(0, selectedMonth - 1).toLocaleString('tr-TR', { month: 'long' })} Ayı Özeti</h3>
                    </div>
                    <div className="card-body" style={{ padding: '0', overflowX: 'auto' }}>
                        <table className="modern-table dense">
                            <thead>
                                <tr style={{ backgroundColor: '#f1f5f9', fontSize: '12px' }}>
                                    <th style={{ width: '200px' }}>Personel</th>
                                    <th style={{ textAlign: 'center', color: '#16a34a' }}>Geldi (✔)</th>
                                    <th style={{ textAlign: 'center', color: '#0284c7' }}>Haftalık (H)</th>
                                    <th style={{ textAlign: 'center', color: '#ea580c' }}>Yıllık (Y)</th>
                                    <th style={{ textAlign: 'center', color: '#ca8a04' }}>Raporlu (R)</th>
                                    <th style={{ textAlign: 'center', color: '#dc2626' }}>Ücretsiz (Ü)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {personnelList.map(p => {
                                    const stats = calculateSummary(p.id!);
                                    return (
                                        <tr key={p.id} className="hover-row">
                                            <td style={{ fontWeight: '600', fontSize: '13px', color: '#334155' }}>{p.fullName}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px', color: '#16a34a' }}>{stats.geldi || '-'}</td>
                                            <td style={{ textAlign: 'center', fontWeight: '600', color: '#0284c7' }}>{stats.haftalik || '-'}</td>
                                            <td style={{ textAlign: 'center', fontWeight: '600', color: '#ea580c' }}>{stats.yillik || '-'}</td>
                                            <td style={{ textAlign: 'center', fontWeight: '600', color: '#ca8a04' }}>{stats.raporlu || '-'}</td>
                                            <td style={{ textAlign: 'center', fontWeight: '600', color: '#dc2626' }}>{stats.ucretsiz || '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : selectedStoreId ? (
                <div style={{ textAlign: 'center', padding: '50px', color: '#94a3b8', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    Seçili mağazada aktif personel bulunmamaktadır.
                </div>
            ) : null}

            {selectedStoreId && personnelList.length > 0 && (
                <div className="card">
                    <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                        <table className="data-table dense" style={{ borderCollapse: 'collapse', width: '100%', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f1f5f9' }}>
                                    <th style={{ position: 'sticky', left: 0, zIndex: 10, backgroundColor: '#f1f5f9', borderRight: '2px solid #cbd5e1', minWidth: '150px', padding: '10px' }}>
                                        Personel Listesi
                                    </th>
                                    {daysArray.map(day => {
                                        const date = new Date(selectedYear, selectedMonth - 1, day);
                                        const isWeekend = date.getDay() === 0; // Pazar günleri
                                        return (
                                            <th key={day} style={{ minWidth: '32px', textAlign: 'center', padding: '6px 2px', backgroundColor: isWeekend ? '#fee2e2' : 'inherit', color: isWeekend ? '#dc2626' : '#475569', borderLeft: '1px solid #e2e8f0' }}>
                                                <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{day}</div>
                                                <div style={{ fontSize: '10px', fontWeight: 'normal', opacity: 0.8 }}>{date.toLocaleDateString('tr-TR', { weekday: 'short' }).slice(0, 2)}</div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {personnelList.map(person => (
                                    <tr key={person.id}>
                                        <td style={{ position: 'sticky', left: 0, zIndex: 5, backgroundColor: 'white', borderRight: '2px solid #cbd5e1', fontWeight: '600', color: '#334155', padding: '8px 10px', boxShadow: '2px 0 5px rgba(0,0,0,0.02)' }}>
                                            {person.fullName}
                                        </td>
                                        {daysArray.map(day => {
                                            const key = `${person.id}_${String(day).padStart(2, '0')}`;
                                            const status = localMap[key];
                                            const style = getCellContent(status);
                                            const date = new Date(selectedYear, selectedMonth - 1, day);
                                            const isWeekend = date.getDay() === 0;

                                            // Kilit Kontrolü
                                            const isLocked = !!originalMap[key];

                                            return (
                                                <td key={day}
                                                    onClick={() => cycleStatus(person.id!, day)}
                                                    style={{
                                                        textAlign: 'center',
                                                        cursor: isLocked ? 'not-allowed' : 'pointer',
                                                        backgroundColor: status ? style.bg : (isWeekend ? '#fef2f2' : 'white'),
                                                        color: style.color,
                                                        fontWeight: 'bold',
                                                        fontSize: '14px',
                                                        borderLeft: '1px solid #e2e8f0',
                                                        borderBottom: '1px solid #e2e8f0',
                                                        userSelect: 'none',
                                                        height: '40px',
                                                        padding: 0,
                                                        opacity: isLocked ? 0.7 : 1,
                                                        transition: 'background-color 0.2s'
                                                    }}
                                                    title={isLocked ? "Kaydedilmiş puantaj değiştirilemez" : "Değiştirmek için tıklayın"}
                                                >
                                                    {status ? style.text : ''}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div style={{ marginTop: '20px', display: 'flex', gap: '20px', fontSize: '12px', color: '#64748b', flexWrap: 'wrap', justifyContent: 'center', backgroundColor: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}><span style={{ width: '16px', height: '16px', background: '#2ecc71', borderRadius: '4px' }}></span> Geldi (✔)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}><span style={{ width: '16px', height: '16px', background: '#3498db', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px' }}>H</span> Haftalık İzin</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}><span style={{ width: '16px', height: '16px', background: '#e67e22', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px' }}>Y</span> Yıllık İzin</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}><span style={{ width: '16px', height: '16px', background: '#f1c40f', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black', fontSize: '10px' }}>R</span> Raporlu</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}><span style={{ width: '16px', height: '16px', background: '#e74c3c', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px' }}>Ü</span> Ücretsiz İzin</div>
            </div>
        </div>
    );
};

export default AttendanceManager;