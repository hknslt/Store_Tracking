// src/pages/personnel/AttendanceManager.tsx
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc, collection, query, where, getDocs, setDoc } from "firebase/firestore";
import { getStores } from "../../services/storeService";

import type { Store, Personnel, AttendanceType } from "../../types";
import "../../App.css";

// Puantaj Verisi Yapısı (Matrix için optimize edilmiş)
// Key: "personnelId_YYYY-MM-DD", Value: AttendanceType
type AttendanceMap = Record<string, AttendanceType>;

const AttendanceManager = () => {
    const { currentUser } = useAuth();

    // State'ler
    const [stores, setStores] = useState<Store[]>([]);
    const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
    const [attendanceMap, setAttendanceMap] = useState<AttendanceMap>({});

    const [selectedStoreId, setSelectedStoreId] = useState("");

    // Varsayılan olarak bugünün ayı
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12

    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    // Ayın günlerini hesapla
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // --- 1. BAŞLANGIÇ ---
    useEffect(() => {
        const init = async () => {
            if (!currentUser) return;
            const sData = await getStores();
            setStores(sData);

            const userDoc = await getDoc(doc(db, "personnel", currentUser.uid));
            if (userDoc.exists()) {
                const u = userDoc.data() as Personnel;
                if (u.role === 'admin') { setIsAdmin(true); }
                else { setIsAdmin(false); setSelectedStoreId(u.storeId); }
            }
            setLoading(false);
        };
        init();
    }, [currentUser]);

    // --- 2. VERİLERİ YÜKLE ---
    useEffect(() => {
        const loadData = async () => {
            if (!selectedStoreId) {
                setPersonnelList([]);
                setAttendanceMap({});
                return;
            }

            setLoading(true);
            try {
                // A) Personelleri Çek
                const pQuery = query(collection(db, "personnel"), where("storeId", "==", selectedStoreId), where("isActive", "==", true));
                const pSnap = await getDocs(pQuery);
                const pData = pSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Personnel[];
                setPersonnelList(pData);

                // B) Seçili AYIN Tüm Puantajını Çek
                // Not: Burada 'date' string karşılaştırması yapıyoruz. YYYY-MM ile başlayanları çekmek için.
                // Firestore'da 'startAt' ve 'endAt' kullanabiliriz ama basitlik için tüm mağaza verisini çekip filtreleyelim (Veri azsa)
                // Veya daha iyisi: 'month' alanı ekleyip ona göre sorgu atmak.
                // Şimdilik client-side filtreleme yapalım (Performans sorunu olursa sorguyu iyileştiririz)

                const startStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
                const endStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${daysInMonth}`;

                const attQuery = query(
                    collection(db, "attendance"),
                    where("storeId", "==", selectedStoreId),
                    where("date", ">=", startStr),
                    where("date", "<=", endStr)
                );

                const attSnap = await getDocs(attQuery);
                const mapping: AttendanceMap = {};

                attSnap.docs.forEach(doc => {
                    const data = doc.data();
                    const key = `${data.personnelId}_${data.date}`;
                    mapping[key] = data.type as AttendanceType;
                });

                setAttendanceMap(mapping);

            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [selectedStoreId, selectedMonth, selectedYear]);

    // --- DURUM DEĞİŞTİRME (TIKLAYINCA DÖNGÜ) ---
    const cycleStatus = async (personnelId: string, day: number) => {
        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const key = `${personnelId}_${dateStr}`;
        const currentType = attendanceMap[key];

        // Döngü Sırası: Boş -> Geldi -> Raporlu -> İzinli -> Boş
        let nextType: AttendanceType | null = null;

        if (!currentType) nextType = 'Geldi';
        else if (currentType === 'Geldi') nextType = 'İzinli (Haftalık)';
        else if (currentType === 'İzinli (Haftalık)') nextType = 'Raporlu';
        else if (currentType === 'Raporlu') nextType = 'Ücretsiz İzin';
        else nextType = null; // Sil (Boş)

        // Optimistik Güncelleme
        const newMap = { ...attendanceMap };
        if (nextType) newMap[key] = nextType;
        else delete newMap[key];
        setAttendanceMap(newMap);

        // Veritabanına Yaz
        const docId = `att_${personnelId}_${dateStr}`;
        const ref = doc(db, "attendance", docId);

        if (nextType) {
            await setDoc(ref, {
                storeId: selectedStoreId,
                personnelId,
                date: dateStr,
                type: nextType
            }, { merge: true });
        } else {
            // Silmek yerine 'type' alanını boşaltabiliriz veya dökümanı silebiliriz.
            // Kayıt kalsın ama tipi null olsun diyebiliriz, ya da deleteDoc.
            // Basitlik için deleteDoc yapalım veya boş string atayalım.
            // await deleteDoc(ref); // import deleteDoc from firestore
            // Şimdilik boş tip set edelim
            await setDoc(ref, { type: null }, { merge: true });
        }
    };

    // Renk ve İçerik Yardımcısı
    const getCellContent = (type?: AttendanceType) => {
        switch (type) {
            case 'Geldi': return { text: '✔', bg: '#d4edda', color: '#155724' };
            case 'Raporlu': return { text: 'R', bg: '#f8d7da', color: '#721c24' };
            case 'İzinli (Haftalık)': return { text: 'İ', bg: '#d6eaf8', color: '#0c5460' };
            case 'İzinli (Yıllık)': return { text: 'Y', bg: '#e8daef', color: '#6c3483' };
            case 'Ücretsiz İzin': return { text: 'Ü', bg: '#fcf3cf', color: '#856404' };
            default: return { text: '', bg: 'white', color: 'black' };
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="page-title">
                    <h2>Aylık Puantaj Tablosu</h2>
                </div>
            </div>

            {/* FİLTRELER */}
            <div className="card" style={{ marginBottom: '20px', padding: '15px' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>

                    {/* Yıl Seçimi */}
                    <select className="form-input" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={{ width: '100px' }}>
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                    </select>

                    {/* Ay Seçimi */}
                    <select className="form-input" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} style={{ width: '150px' }}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('tr-TR', { month: 'long' })}</option>
                        ))}
                    </select>

                    {/* Mağaza Seçimi */}
                    {isAdmin && (
                        <select className="form-input" value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)} style={{ minWidth: '200px' }}>
                            <option value="">-- Mağaza Seç --</option>
                            {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                        </select>
                    )}
                </div>
            </div>

            {/* MATRIX TABLO */}
            <div className="card">
                <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                    {selectedStoreId ? (
                        <table className="data-table dense" style={{ borderCollapse: 'collapse', width: '100%' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f1f2f6' }}>
                                    <th style={{
                                        position: 'sticky',
                                        left: 0,
                                        zIndex: 10,
                                        backgroundColor: '#f1f2f6',
                                        borderRight: '2px solid #ddd',
                                        minWidth: '200px',
                                        padding: '10px'
                                    }}>
                                        Personel
                                    </th>
                                    {daysArray.map(day => {
                                        // Hafta sonu kontrolü (Cumartesi/Pazar renklendirme)
                                        const date = new Date(selectedYear, selectedMonth - 1, day);
                                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                        return (
                                            <th key={day} style={{
                                                minWidth: '35px',
                                                textAlign: 'center',
                                                fontSize: '12px',
                                                backgroundColor: isWeekend ? '#e9ecef' : 'inherit',
                                                color: isWeekend ? '#c0392b' : 'inherit'
                                            }}>
                                                {day}<br />
                                                <span style={{ fontSize: '9px', fontWeight: 'normal' }}>
                                                    {date.toLocaleDateString('tr-TR', { weekday: 'short' })}
                                                </span>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {personnelList.map(person => (
                                    <tr key={person.id}>
                                        {/* Sabit Personel Kolonu */}
                                        <td style={{
                                            position: 'sticky',
                                            left: 0,
                                            zIndex: 5,
                                            backgroundColor: 'white',
                                            borderRight: '2px solid #ddd',
                                            fontWeight: '600',
                                            color: '#2c3e50',
                                            padding: '8px 12px'
                                        }}>
                                            {person.fullName}
                                        </td>

                                        {/* Gün Hücreleri */}
                                        {daysArray.map(day => {
                                            const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                            const key = `${person.id}_${dateStr}`;
                                            const status = attendanceMap[key];
                                            const style = getCellContent(status);
                                            const date = new Date(selectedYear, selectedMonth - 1, day);
                                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                                            return (
                                                <td
                                                    key={day}
                                                    onClick={() => cycleStatus(person.id!, day)}
                                                    style={{
                                                        textAlign: 'center',
                                                        cursor: 'pointer',
                                                        backgroundColor: status ? style.bg : (isWeekend ? '#f8f9fa' : 'white'),
                                                        color: style.color,
                                                        fontWeight: 'bold',
                                                        fontSize: '14px',
                                                        border: '1px solid #eee',
                                                        userSelect: 'none'
                                                    }}
                                                    title={status || "Boş (Tıkla Değiştir)"}
                                                >
                                                    {style.text}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ padding: '50px', textAlign: 'center', color: '#999' }}>
                            Lütfen mağaza seçiniz.
                        </div>
                    )}
                </div>
            </div>

            {/* LEJANT (AÇIKLAMA) */}
            <div style={{ marginTop: '15px', display: 'flex', gap: '15px', fontSize: '12px', color: '#555', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '15px', height: '15px', background: '#d4edda', border: '1px solid #ccc', display: 'inline-block' }}></span> ✔ Geldi</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '15px', height: '15px', background: '#d6eaf8', border: '1px solid #ccc', display: 'inline-block' }}></span> İ (Haftalık İzin)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '15px', height: '15px', background: '#f8d7da', border: '1px solid #ccc', display: 'inline-block' }}></span> R (Raporlu)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '15px', height: '15px', background: '#fcf3cf', border: '1px solid #ccc', display: 'inline-block' }}></span> Ü (Ücretsiz İzin)</div>
            </div>
        </div>
    );
};

export default AttendanceManager;