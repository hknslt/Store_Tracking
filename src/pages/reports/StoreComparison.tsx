// src/pages/reports/StoreComparison.tsx
import { useEffect, useState, useRef } from "react";
import {collectionGroup, getDocs, query } from "firebase/firestore";
import { db } from "../../firebase";
import { getStores } from "../../services/storeService";
import type { Store } from "../../types";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import "../../App.css";

// İKONLAR
const Icons = {
    pdf: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
    filter: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>,
    check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
};

type ViewMode = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface SaleData {
    id: string;
    storeId: string;
    date: string;
    grandTotal: number;
    type?: string;
}

const StoreComparison = () => {
    const tableRef = useRef<HTMLDivElement>(null);

    // --- STATE ---
    const [stores, setStores] = useState<Store[]>([]);
    const [sales, setSales] = useState<SaleData[]>([]);
    const [loading, setLoading] = useState(true);

    // Filtreler
    const [viewMode, setViewMode] = useState<ViewMode>('daily');
    const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Tarih Seçimleri
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // --- VERİ ÇEKME ---
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const storeData = await getStores();
                setStores(storeData);
                setSelectedStoreIds(storeData.map(s => s.id!));

                // CollectionGroup ile receipts altındaki tüm fişleri çek
                const salesQuery = query(collectionGroup(db, "receipts"));
                const salesSnap = await getDocs(salesQuery);

                const salesData: SaleData[] = [];
                salesSnap.forEach(doc => {
                    const data = doc.data();
                    if (data.type === 'Alış') return;

                    let finalAmount = Number(data.grandTotal || 0);
                    if (finalAmount === 0 && data.items && Array.isArray(data.items)) {
                        finalAmount = data.items.reduce((acc: number, item: any) => acc + (Number(item.total || 0)), 0);
                    }

                    salesData.push({
                        id: doc.id,
                        storeId: data.storeId,
                        date: data.date,
                        grandTotal: finalAmount,
                        type: data.type
                    });
                });
                setSales(salesData);
            } catch (error) {
                console.error("Veri hatası:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // --- YARDIMCI ---
    const fmt = (amount: number) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

    const getWeekNumber = (d: Date) => {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };

    // 🔥 GÜNCELLENMİŞ PDF FONKSİYONU (Çoklu Sayfa Desteği)
    const handleDownloadPDF = async () => {
        if (!tableRef.current) return;

        try {
            // Tabloyu resme dönüştür
            const canvas = await html2canvas(tableRef.current, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');

            // PDF Ayarları (Yatay A4: 297mm x 210mm)
            const pdf = new jsPDF('l', 'mm', 'a4');
            const imgWidth = 297;
            const pageHeight = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            // İlk Sayfayı Ekle
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            // Eğer içerik bir sayfadan uzunsa döngüye girip yeni sayfalar ekle
            while (heightLeft >= 0) {
                position = position - pageHeight; // Resmi yukarı kaydır
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`Magaza_Karsilastirma_${viewMode}.pdf`);
        } catch (err) {
            console.error("PDF hatası:", err);
            alert("PDF oluşturulurken bir hata oluştu.");
        }
    };

    // --- TABLO OLUŞTURMA ---
    const generateTableData = () => {
        const rows: any[] = [];
        const activeStores = stores.filter(s => selectedStoreIds.includes(s.id!));

        if (viewMode === 'daily') {
            const year = selectedDate.getFullYear();
            const month = selectedDate.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            for (let day = 1; day <= daysInMonth; day++) {
                const rowData: any = { label: `${day} ${selectedDate.toLocaleString('tr-TR', { month: 'long' })}` };
                let rowTotal = 0;
                activeStores.forEach(store => {
                    const dailyTotal = sales.filter(s => {
                        const d = new Date(s.date);
                        return s.storeId === store.id && d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
                    }).reduce((acc, curr) => acc + curr.grandTotal, 0);

                    rowData[store.id!] = dailyTotal;
                    rowTotal += dailyTotal;
                });
                rowData['total'] = rowTotal;
                rows.push(rowData);
            }
        }
        else if (viewMode === 'weekly') {
            for (let week = 1; week <= 53; week++) {
                const label = `${selectedYear} - ${week}. Hafta`;
                const rowData: any = { label };
                let rowTotal = 0;
                activeStores.forEach(store => {
                    const weeklyTotal = sales.filter(s => {
                        const sDate = new Date(s.date);
                        return s.storeId === store.id && sDate.getFullYear() === selectedYear && getWeekNumber(sDate) === week;
                    }).reduce((acc, curr) => acc + curr.grandTotal, 0);
                    rowData[store.id!] = weeklyTotal;
                    rowTotal += weeklyTotal;
                });
                rowData['total'] = rowTotal;
                rows.push(rowData);
            }
            rows.reverse();
        }
        else if (viewMode === 'monthly') {
            const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
            months.forEach((mName, idx) => {
                const rowData: any = { label: `${mName} ${selectedYear}` };
                let rowTotal = 0;
                activeStores.forEach(store => {
                    const monthlyTotal = sales.filter(s => {
                        const d = new Date(s.date);
                        return s.storeId === store.id && d.getMonth() === idx && d.getFullYear() === selectedYear;
                    }).reduce((acc, curr) => acc + curr.grandTotal, 0);
                    rowData[store.id!] = monthlyTotal;
                    rowTotal += monthlyTotal;
                });
                rowData['total'] = rowTotal;
                rows.push(rowData);
            });
        }
        else if (viewMode === 'yearly') {
            const years = Array.from(new Set(sales.map(s => new Date(s.date).getFullYear()))).sort((a, b) => b - a);
            if (years.length === 0) years.push(new Date().getFullYear());
            years.forEach(year => {
                const rowData: any = { label: year.toString() };
                let rowTotal = 0;
                activeStores.forEach(store => {
                    const yearlyTotal = sales.filter(s => s.storeId === store.id && new Date(s.date).getFullYear() === year)
                        .reduce((acc, curr) => acc + curr.grandTotal, 0);
                    rowData[store.id!] = yearlyTotal;
                    rowTotal += yearlyTotal;
                });
                rowData['total'] = rowTotal;
                rows.push(rowData);
            });
        }
        return { rows, activeStores };
    };

    const { rows, activeStores } = generateTableData();

    const toggleStore = (id: string) => {
        if (selectedStoreIds.includes(id)) setSelectedStoreIds(prev => prev.filter(x => x !== id));
        else setSelectedStoreIds(prev => [...prev, id]);
    };

    if (loading) return <div className="page-container">Veriler Yükleniyor...</div>;

    const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    return (
        <div className="page-container" style={{ maxWidth: '100%' }}>
            <div className="page-header">
                <div className="page-title">
                    <h2>Mağaza Karşılaştırma</h2>
                    <p>Şubelerin performansını yan yana kıyaslayın.</p>
                </div>
            </div>

            {/* --- KONTROL PANELİ --- */}
            <div className="card" style={{ marginBottom: '20px', padding: '15px', position: 'relative', zIndex: 100, overflow: 'visible' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'space-between' }}>

                    {/* Görünüm Modu */}
                    <div style={{ display: 'flex', gap: '5px', background: '#f1f5f9', padding: '5px', borderRadius: '8px' }}>
                        {['daily', 'weekly', 'monthly', 'yearly'].map((m: any) => (
                            <button key={m} onClick={() => setViewMode(m)} className={`tab-btn ${viewMode === m ? 'active' : ''}`}>
                                {m === 'daily' ? 'Günlük' : m === 'weekly' ? 'Haftalık' : m === 'monthly' ? 'Aylık' : 'Yıllık'}
                            </button>
                        ))}
                    </div>

                    {/* Tarih / Yıl Seçimi */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {viewMode === 'daily' && (
                            <input type="month" className="form-input" value={selectedDate.toISOString().slice(0, 7)} onChange={(e) => setSelectedDate(new Date(e.target.value))} />
                        )}
                        {(viewMode === 'monthly' || viewMode === 'weekly') && (
                            <select className="form-input" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        )}
                    </div>

                    {/* Mağaza Filtresi ve PDF */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div className="dropdown-container" style={{ position: 'relative' }}>
                            <button
                                className="form-input"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: '200px', justifyContent: 'space-between', cursor: 'pointer' }}
                            >
                                <span>{selectedStoreIds.length} Mağaza Seçili</span>
                                {Icons.filter}
                            </button>

                            {isDropdownOpen && (
                                <div className="dropdown-menu">
                                    {stores.map(s => (
                                        <div key={s.id} onClick={() => toggleStore(s.id!)} className="dropdown-item">
                                            <div style={{
                                                width: '16px', height: '16px', borderRadius: '3px', border: '1px solid #cbd5e1',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                backgroundColor: selectedStoreIds.includes(s.id!) ? '#3b82f6' : 'white'
                                            }}>
                                                {selectedStoreIds.includes(s.id!) && <span style={{ color: 'white', fontSize: '10px' }}>✓</span>}
                                            </div>
                                            {s.storeName}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button onClick={handleDownloadPDF} className="btn btn-secondary" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            {Icons.pdf} PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* TABLO (z-index: 1 ile arkada) */}
            <div className="card" ref={tableRef} style={{ position: 'relative', zIndex: 1 }}>
                <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                    <table className="data-table" style={{ width: '100%', minWidth: '800px', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                <th style={{ width: '150px', position: 'sticky', left: 0, background: '#f8fafc', zIndex: 5, padding: '10px' }}>Dönem</th>
                                {activeStores.map(store => (
                                    <th key={store.id} style={{ textAlign: 'right', minWidth: '100px', padding: '10px' }}>{store.storeName}</th>
                                ))}
                                <th style={{ textAlign: 'right', minWidth: '100px', backgroundColor: '#eff6ff', color: '#1e3a8a', padding: '10px' }}>TOPLAM</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length > 0 ? (
                                rows.map((row, index) => (
                                    <tr key={index} className="hover-row">
                                        <td style={{ fontWeight: '600', position: 'sticky', left: 0, background: 'white', zIndex: 5, borderRight: '1px solid #f1f5f9', padding: '8px 10px' }}>
                                            {row.label}
                                        </td>
                                        {activeStores.map(store => {
                                            const val = row[store.id!] || 0;
                                            return <td key={store.id} style={{ textAlign: 'right', color: val > 0 ? '#334155' : '#cbd5e1', padding: '8px 10px' }}>{val > 0 ? fmt(val) : '-'}</td>;
                                        })}
                                        <td style={{ textAlign: 'right', fontWeight: 'bold', backgroundColor: '#eff6ff', color: '#1e40af', padding: '8px 10px' }}>{fmt(row.total)} ₺</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={activeStores.length + 2} style={{ textAlign: 'center', padding: '30px', color: '#999' }}>Veri bulunamadı.</td></tr>
                            )}
                        </tbody>
                        <tfoot style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                            <tr>
                                <td style={{ position: 'sticky', left: 0, background: '#f1f5f9', zIndex: 5, padding: '10px' }}>GENEL TOPLAM</td>
                                {activeStores.map(store => {
                                    const total = rows.reduce((acc, curr) => acc + (curr[store.id!] || 0), 0);
                                    return <td key={store.id} style={{ textAlign: 'right', padding: '10px' }}>{fmt(total)}</td>
                                })}
                                <td style={{ textAlign: 'right', color: '#1e40af', padding: '10px' }}>{fmt(rows.reduce((acc, curr) => acc + curr.total, 0))} ₺</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Overlay */}
            {isDropdownOpen && <div onClick={() => setIsDropdownOpen(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 99 }}></div>}

            <style>{`
                .tab-btn {
                    border: none; background: transparent; padding: 8px 16px; 
                    border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; color: #64748b;
                    transition: all 0.2s;
                }
                .tab-btn.active {
                    background: white; color: #3b82f6; box-shadow: 0 2px 5px rgba(0,0,0,0.05);
                }
                .dropdown-menu {
                    position: absolute; top: 100%; right: 0; width: 250px;
                    background: white; border: 1px solid #e2e8f0; border-radius: 8px;
                    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.2); padding: 10px; margin-top: 5px; 
                    max-height: 300px; overflow-y: auto; 
                    z-index: 1000;
                }
                .dropdown-item {
                    display: flex; gap: 10px; align-items: center; padding: 8px; 
                    cursor: pointer; border-radius: 6px; font-size: 13px;
                }
                .dropdown-item:hover { background: #f1f5f9; }
            `}</style>
        </div>
    );
};

export default StoreComparison;