// src/pages/tracking/InvoiceTracking.tsx

import { useEffect, useState } from "react";

import { getStores } from "../../services/storeService";

import { getInvoiceTrackingData, type TrackingRow } from "../../services/trackingService";

import type { Store } from "../../types";

import "../../App.css";



const InvoiceTracking = () => {



    // --- INPUT STATE'LERİ (Sadece ekrandaki kutuları kontrol eder) ---

    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const [selectedStoreId, setSelectedStoreId] = useState("");

    const [searchTerm, setSearchTerm] = useState("");



    // --- DATA STATE'LERİ (Tabloyu kontrol eder) ---

    const [stores, setStores] = useState<Store[]>([]);

    const [displayedRows, setDisplayedRows] = useState<TrackingRow[]>([]); //   Ekrana basılan nihai liste

    const [loading, setLoading] = useState(false);



    // Başlangıç Ayarları

    useEffect(() => {

        getStores().then(setStores);



        // Tarihleri ayarla (Son 30 gün)

        const today = new Date();

        const past = new Date();

        past.setDate(today.getDate() - 30);



        const startStr = past.toISOString().split('T')[0];

        const endStr = today.toISOString().split('T')[0];



        setStartDate(startStr);

        setEndDate(endStr);



        // Sayfa ilk açıldığında otomatik bir kere çeksin (İsterseniz bunu kaldırabilirsiniz)

        handleListele(startStr, endStr, "", "");

    }, []);



    // --- BUTON FONKSİYONU (Hem Çeker Hem Filtreler) ---

    const handleListele = async (

        start = startDate,

        end = endDate,

        storeId = selectedStoreId,

        search = searchTerm

    ) => {

        setLoading(true);



        // 1. Veritabanından Tarihe Göre Çek (En güncel veriyi al)

        const rawData = await getInvoiceTrackingData(start, end);



        // 2. JavaScript ile Filtrele (Mağaza ve Arama Kelimesine göre)

        const filtered = rawData.filter(r => {

            // Mağaza Filtresi

            if (storeId && r.sale.storeId !== storeId) {

                return false;

            }



            // Arama Filtresi

            const searchLower = search.toLowerCase();

            const receiptMatch = (r.sale.receiptNo || "").toLowerCase().includes(searchLower);

            const customerMatch = (r.sale.customerName || "").toLowerCase().includes(searchLower);



            return receiptMatch || customerMatch;

        });



        // 3. Sonucu Tabloya Yaz

        setDisplayedRows(filtered);

        setLoading(false);

    };



    // --- HESAPLAMA MANTIĞI ---

    const getShippingStatus = (row: TrackingRow) => {

        const { sale } = row;



        const isCancelled = (sale as any).status === 'İptal' || sale.items.every(i => i.deliveryStatus === 'İptal');

        if (isCancelled) return <span className="badge badge-red">İPTAL EDİLDİ</span>;



        const isAllDelivered = sale.items.every(i => i.deliveryStatus === 'Teslim Edildi');



        if (isAllDelivered) {

            const cost = Number(sale.shippingCost || 0);

            return <span className="badge badge-green" style={{ fontSize: '11px' }}>

                {cost > 0 ? `${cost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ (Nakliye)` : 'TESLİM EDİLDİ'}

            </span>;

        }



        return <span className="badge badge-yellow" style={{ fontSize: '11px' }}>BEKLEMEDE</span>;

    };



    // Toplamlar (Sadece ekranda görünenler üzerinden)

    const totalRevenue = displayedRows.reduce((acc, r) => acc + Number(r.sale.grandTotal || 0), 0);

    const totalRemaining = displayedRows.reduce((acc, r) => acc + Number(r.debt?.remainingAmount || 0), 0);



    // Stiller

    const thStyle = { backgroundColor: '#f8fafc', color: '#64748b', fontSize: '12px', fontWeight: '700', padding: '12px 15px', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' as const, textAlign: 'left' as const };

    const tdStyle = { padding: '12px 15px', borderBottom: '1px solid #f1f5f9', fontSize: '13px', color: '#334155', verticalAlign: 'middle' };



    return (

        <div className="page-container">

            <style>{`

                .filter-container {

                    display: grid;

                    grid-template-columns: auto auto auto 1fr auto;

                    gap: 15px;

                    align-items: end;

                    background: white;

                    padding: 20px;

                    border-radius: 12px;

                    box-shadow: 0 2px 5px rgba(0,0,0,0.03);

                    margin-bottom: 20px;

                }

                .filter-group { display: flex; flexDirection: column; gap: 5px; }

                .filter-label { font-size: 11px; font-weight: 600; color: #64748b; margin-left: 2px; }

                .filter-input {

                    padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; background: #f8fafc; outline: none; transition: all 0.2s;

                }

                .filter-input:focus { border-color: #3b82f6; background: white; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }

                @media (max-width: 1000px) {

                    .filter-container { grid-template-columns: 1fr 1fr; }

                    .full-width-mobile { grid-column: span 2; }

                }

            `}</style>



            <div className="page-header" style={{ marginBottom: '20px' }}>

                <div className="page-title">

                    <h2>Fiş ve Ödeme Takip</h2>

                    <p>Satış fişlerinin finansal ve lojistik durum özeti</p>

                </div>

            </div>



            {/* --- FİLTRE BAR --- */}

            <div className="filter-container">

                <div className="filter-group">

                    <label className="filter-label">Başlangıç Tarihi</label>

                    <input type="date" className="filter-input" style={{ width: '140px' }} value={startDate} onChange={e => setStartDate(e.target.value)} />

                </div>



                <div className="filter-group">

                    <label className="filter-label">Bitiş Tarihi</label>

                    <input type="date" className="filter-input" style={{ width: '140px' }} value={endDate} onChange={e => setEndDate(e.target.value)} />

                </div>



                <div className="filter-group full-width-mobile">

                    <label className="filter-label">Mağaza Seçimi</label>

                    <select className="filter-input" style={{ minWidth: '220px' }} value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)}>

                        <option value="">Tüm Mağazalar</option>

                        {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}

                    </select>

                </div>



                <div className="filter-group full-width-mobile">

                    <label className="filter-label">Fiş No / Müşteri</label>

                    <input type="text" className="filter-input" placeholder="Aramak istediğiniz kelime..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />

                </div>



                <div>

                    {/*   BUTTON onClick event'i handleListele'yi çağırıyor */}

                    <button onClick={() => handleListele()} className="btn btn-primary" style={{ height: '38px', padding: '0 25px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>

                        <span>↻</span> VERİLERİ GETİR

                    </button>

                </div>

            </div>



            {/* --- TABLO --- */}

            <div className="card" style={{ overflow: 'hidden', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>

                <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>

                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>

                        <thead>

                            <tr>

                                <th style={thStyle}>Tarih</th>

                                <th style={thStyle}>Fiş No</th>

                                <th style={thStyle}>Mağaza</th>

                                <th style={thStyle}>Müşteri</th>

                                <th style={{ ...thStyle, textAlign: 'right' }}>Fiş Tutarı</th>

                                <th style={{ ...thStyle, textAlign: 'right' }}>Ödenen</th>

                                <th style={{ ...thStyle, textAlign: 'right' }}>Kalan (Borç)</th>

                                <th style={{ ...thStyle, textAlign: 'center' }}>Ödeme Durumu</th>

                                <th style={{ ...thStyle, textAlign: 'center' }}>Nakliye / Teslimat</th>

                            </tr>

                        </thead>

                        <tbody>

                            {loading ? (

                                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Yükleniyor...</td></tr>

                            ) : displayedRows.length === 0 ? (

                                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Kayıt bulunamadı.</td></tr>

                            ) : (

                                displayedRows.map((row) => {

                                    const { sale, debt } = row;

                                    const storeName = stores.find(s => s.id === sale.storeId)?.storeName || "Merkez";



                                    const paymentStatus = debt?.status || 'Ödenmedi';

                                    const statusColor = paymentStatus === 'Ödendi' ? '#166534' : paymentStatus === 'Kısmi Ödeme' ? '#b45309' : '#991b1b';

                                    const statusBg = paymentStatus === 'Ödendi' ? '#dcfce7' : paymentStatus === 'Kısmi Ödeme' ? '#fef3c7' : '#fee2e2';



                                    const isCancelled = (sale as any).status === 'İptal';

                                    const rowOpacity = isCancelled ? 0.5 : 1;

                                    const textDecoration = isCancelled ? 'line-through' : 'none';



                                    const valGrandTotal = Number(sale.grandTotal || 0);

                                    const valPaid = Number(debt?.paidAmount || 0);

                                    const valRemaining = debt ? Number(debt.remainingAmount || 0) : valGrandTotal;



                                    return (

                                        <tr key={sale.id} className="hover-row" style={{ opacity: rowOpacity }}>

                                            <td style={tdStyle}>{new Date(sale.date).toLocaleDateString('tr-TR')}</td>

                                            <td style={{ ...tdStyle, fontWeight: '600' }}>

                                                <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', textDecoration }}>{sale.receiptNo}</span>

                                            </td>

                                            <td style={tdStyle}>{storeName}</td>

                                            <td style={{ ...tdStyle, fontWeight: '600' }}>{sale.customerName}</td>



                                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold', color: '#1e293b' }}>

                                                {valGrandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺

                                            </td>



                                            <td style={{ ...tdStyle, textAlign: 'right', color: '#16a34a', fontWeight: '600' }}>

                                                {valPaid > 0 ? valPaid.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺' : '-'}

                                            </td>



                                            <td style={{ ...tdStyle, textAlign: 'right', color: valRemaining > 0 ? '#dc2626' : '#94a3b8', fontWeight: 'bold' }}>

                                                {valRemaining.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺

                                            </td>



                                            <td style={{ ...tdStyle, textAlign: 'center' }}>

                                                <span style={{ backgroundColor: statusBg, color: statusColor, padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>

                                                    {debt ? debt.status : 'BORÇ KAYDI YOK'}

                                                </span>

                                            </td>



                                            <td style={{ ...tdStyle, textAlign: 'center' }}>

                                                {getShippingStatus(row)}

                                            </td>

                                        </tr>

                                    );

                                })

                            )}

                        </tbody>

                        {!loading && displayedRows.length > 0 && (

                            <tfoot style={{ position: 'sticky', bottom: 0, backgroundColor: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>

                                <tr>

                                    <td colSpan={4} style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', fontSize: '13px', color: '#64748b' }}>GENEL TOPLAM:</td>

                                    <td style={{ padding: '15px', textAlign: 'right', fontWeight: '800', fontSize: '15px', color: '#1e293b' }}>{totalRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>

                                    <td style={{ padding: '15px', textAlign: 'right', fontWeight: '800', fontSize: '15px', color: '#16a34a' }}>{(totalRevenue - totalRemaining).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>

                                    <td style={{ padding: '15px', textAlign: 'right', fontWeight: '800', fontSize: '15px', color: '#dc2626' }}>{totalRemaining.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>

                                    <td colSpan={2}></td>

                                </tr>

                            </tfoot>

                        )}

                    </table>

                </div>

            </div>

        </div>

    );

};



export default InvoiceTracking;

