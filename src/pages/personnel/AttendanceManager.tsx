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
    const [loading, setLoading] = useState(true);
    const [hasChanges, setHasChanges] = useState(false);

    // Ayın günleri
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // --- BAŞLANGIÇ ---
    useEffect(() => {
        const init = async () => {
            if (!currentUser) return;
            const sData = await getStores();
            setStores(sData);

            const userDoc = await getDoc(doc(db, "personnel", currentUser.uid));
            if (userDoc.exists()) {
                const u = userDoc.data() as SystemUser;
                if (u.role === 'admin' || u.role === 'control') { // Admin veya Kontrol yetkilisi
                    setIsAdmin(true);
                } else if (u.role === 'store_admin') {
                    setIsAdmin(false);
                    if (u.storeId) setSelectedStoreId(u.storeId);
                }
            }
            setLoading(false)
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
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [selectedStoreId, selectedMonth, selectedYear]);

    // --- HÜCRE TIKLAMA (DÜZENLEME) ---
    const cycleStatus = (personnelId: string, day: number) => {
        const key = `${personnelId}_${String(day).padStart(2, '0')}`;

        // 🔒 KİLİT KONTROLÜ: Eğer bu kayıt veritabanında zaten varsa (originalMap), değiştirilemez.
        if (originalMap[key]) {
            // İsteğe bağlı: Kullanıcıya uyarı verilebilir
            // alert("Kaydedilmiş puantaj değiştirilemez!"); 
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
            alert("✅ Kayıt Başarılı!");
        } catch (error) {
            alert("Kayıt sırasında hata oluştu!");
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
            <div className="page-header">
                <div className="page-title">
                    <h2>Personel Puantaj</h2>
                </div>
                {hasChanges && (
                    <button onClick={handleSave} className="btn btn-success" style={{ padding: '10px 25px', fontSize: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    DEĞİŞİKLİKLERİ KAYDET
                    </button>
                )}
            </div>

            <div className="card" style={{ marginBottom: '15px', padding: '15px' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <select className="form-input" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={{ width: '120px' }}>
                        {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select className="form-input" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} style={{ width: '120px' }}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('tr-TR', { month: 'long' })}</option>
                        ))}
                    </select>
                    {isAdmin && (
                        <select className="form-input" value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)} style={{ minWidth: '200px' }}>
                            <option value="">-- Mağaza Seç --</option>{stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                        </select>
                    )}
                </div>
            </div>

            {selectedStoreId && personnelList.length > 0 && (
                <div className="card" style={{ marginBottom: '15px' }}>
                    <div className="card-header" style={{ backgroundColor: '#fdfdfd' }}>
                        <h3 className="card-title" style={{ fontSize: '14px' }}>📊 {selectedMonth}. Ay Özeti</h3>
                    </div>
                    <div className="card-body" style={{ padding: '0', overflowX: 'auto' }}>
                        <table className="data-table dense">
                            <thead>
                                <tr style={{ backgroundColor: '#f8f9fa', fontSize: '11px' }}>
                                    <th>Personel</th>
                                    <th style={{ textAlign: 'center', color: '#2ecc71' }}>Geldi</th>
                                    <th style={{ textAlign: 'center', color: '#3498db' }}>Haftalık</th>
                                    <th style={{ textAlign: 'center', color: '#e67e22' }}>Yıllık</th>
                                    <th style={{ textAlign: 'center', color: '#f1c40f' }}>Raporlu</th>
                                    <th style={{ textAlign: 'center', color: '#e74c3c' }}>Ücretsiz</th>
                                </tr>
                            </thead>
                            <tbody>
                                {personnelList.map(p => {
                                    const stats = calculateSummary(p.id!);
                                    return (
                                        <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ fontWeight: '600', fontSize: '12px' }}>{p.fullName}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{stats.geldi || '-'}</td>
                                            <td style={{ textAlign: 'center' }}>{stats.haftalik || '-'}</td>
                                            <td style={{ textAlign: 'center' }}>{stats.yillik || '-'}</td>
                                            <td style={{ textAlign: 'center' }}>{stats.raporlu || '-'}</td>
                                            <td style={{ textAlign: 'center' }}>{stats.ucretsiz || '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="card">
                <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                    {selectedStoreId ? (
                        <table className="data-table dense" style={{ borderCollapse: 'collapse', width: '100%', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f1f2f6' }}>
                                    <th style={{ position: 'sticky', left: 0, zIndex: 10, backgroundColor: '#f1f2f6', borderRight: '2px solid #ddd', minWidth: '150px', padding: '8px' }}>
                                        Personel
                                    </th>
                                    {daysArray.map(day => {
                                        const date = new Date(selectedYear, selectedMonth - 1, day);
                                        const isWeekend = date.getDay() === 0;
                                        return (
                                            <th key={day} style={{ minWidth: '28px', textAlign: 'center', padding: '4px', backgroundColor: isWeekend ? '#ffebee' : 'inherit', color: isWeekend ? '#c0392b' : 'inherit', borderLeft: '1px solid #eee' }}>
                                                {day}<br /><span style={{ fontSize: '9px', fontWeight: 'normal', opacity: 0.7 }}>{date.toLocaleDateString('tr-TR', { weekday: 'short' }).slice(0, 2)}</span>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {personnelList.map(person => (
                                    <tr key={person.id}>
                                        <td style={{ position: 'sticky', left: 0, zIndex: 5, backgroundColor: 'white', borderRight: '2px solid #ddd', fontWeight: '600', color: '#2c3e50', padding: '6px 10px' }}>
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
                                                        cursor: isLocked ? 'not-allowed' : 'pointer', // Kilitliyse imleç değişir
                                                        backgroundColor: status ? style.bg : (isWeekend ? '#fafafa' : 'white'),
                                                        color: style.color,
                                                        fontWeight: 'bold',
                                                        fontSize: '13px',
                                                        borderLeft: '1px solid #eee',
                                                        borderBottom: '1px solid #eee',
                                                        userSelect: 'none',
                                                        height: '35px',
                                                        padding: 0,
                                                        opacity: isLocked ? 0.8 : 1 // Kilitli olduğunu görsel olarak da hissettir
                                                    }}
                                                    title={isLocked ? "🔒 Kayıtlı Veri Değiştirilemez" : (status || "Boş")}
                                                >
                                                    {status ? style.text : (isLocked ? '' : '')}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ padding: '50px', textAlign: 'center', color: '#999' }}>Lütfen mağaza seçiniz.</div>
                    )}
                </div>
            </div>

            <div style={{ marginTop: '15px', display: 'flex', gap: '15px', fontSize: '11px', color: '#555', flexWrap: 'wrap', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '12px', height: '12px', background: '#2ecc71' }}></span> Geldi</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '12px', height: '12px', background: '#3498db' }}></span> Haftalık İzin</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '12px', height: '12px', background: '#e67e22' }}></span> Yıllık İzin</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '12px', height: '12px', background: '#f1c40f' }}></span> Raporlu</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '12px', height: '12px', background: '#e74c3c' }}></span> Ücretsiz İzin</div>
            </div>
        </div>
    );
};

export default AttendanceManager;