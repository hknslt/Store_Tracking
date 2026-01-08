// src/pages/purchases/PurchaseList.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { getPurchasesByStore, updatePurchaseItemStatus } from "../../services/purchaseService";
import { getStores } from "../../services/storeService";
import type { Purchase, Store, Personnel, PurchaseStatus } from "../../types";
import "../../App.css";

const PurchaseList = () => {
    const { currentUser } = useAuth();
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    
    // Filtreler
    const [selectedStoreId, setSelectedStoreId] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

    // Başlangıç
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
        };
        init();
    }, [currentUser]);

    // Verileri Çek
    useEffect(() => {
        if (!selectedStoreId) return;
        getPurchasesByStore(selectedStoreId).then(data => {
            setPurchases(data);
        });
    }, [selectedStoreId]);

    // Durum Değiştirme
    const handleStatusChange = async (purchaseId: string, itemIndex: number, newStatus: PurchaseStatus) => {
        if (!selectedStoreId) return;
        try {
            await updatePurchaseItemStatus(selectedStoreId, purchaseId, itemIndex, newStatus);
            const updated = [...purchases];
            const pIndex = updated.findIndex(p => p.id === purchaseId);
            if (pIndex > -1) {
                updated[pIndex].items[itemIndex].status = newStatus;
                setPurchases(updated);
            }
        } catch (error) {
            console.error(error);
            alert("Durum güncellenemedi!");
        }
    };

    // Renk Yardımcısı
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Beklemede': return '#f39c12';
            case 'Onaylandı': return '#3498db';
            case 'Üretim': return '#9b59b6';
            case 'Sevkiyat': return '#e67e22';
            case 'Tamamlandı': return '#27ae60';
            default: return '#95a5a6';
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="page-title">
                    <h2>İşlem Listesi</h2>
                    <p>Alışlar, İadeler ve Sipariş Talepleri</p>
                </div>
                <Link to="/purchases/add" className="btn btn-primary">+ Yeni İşlem</Link>
            </div>

            {/* MAĞAZA SEÇİMİ (ADMİN İÇİN) */}
            <div className="card" style={{ marginBottom: '20px', padding: '15px' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems:'center' }}>
                    {isAdmin && (
                        <select className="form-input" value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)} style={{maxWidth:'250px'}}>
                            <option value="">-- Mağaza Seçiniz --</option>
                            {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                        </select>
                    )}
                </div>
            </div>

            {/* LİSTE */}
            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    <table className="data-table">
                        <thead>
                            <tr style={{ backgroundColor: '#f8f9fa' }}>
                                <th style={{width:'5%'}}></th>
                                <th style={{width:'10%'}}>Tarih</th>
                                <th style={{width:'10%'}}>Tür</th>
                                <th style={{width:'20%'}}>İlgili Kişi / Açıklama</th>
                                <th style={{width:'15%'}}>Fiş No</th>
                                <th style={{width:'15%'}}>Personel</th>
                                <th style={{width:'10%', textAlign:'right'}}>Tutar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchases.map(p => (
                                <>
                                    <tr key={p.id} className="hover-row" onClick={() => setExpandedRowId(expandedRowId === p.id ? null : p.id!)} style={{cursor:'pointer'}}>
                                        <td style={{textAlign:'center', color:'#3498db'}}>{expandedRowId === p.id ? '▼' : '▶'}</td>
                                        <td>{new Date(p.date).toLocaleDateString('tr-TR')}</td>
                                        <td>
                                            <span className="badge" style={{
                                                backgroundColor: p.type === 'İade' ? '#fadbd8' : (p.type === 'Sipariş' ? '#d6eaf8' : '#eafaf1'),
                                                color: p.type === 'İade' ? '#c0392b' : (p.type === 'Sipariş' ? '#2980b9' : '#27ae60')
                                            }}>
                                                {p.type}
                                            </span>
                                        </td>
                                        <td style={{fontWeight:'600'}}>
                                            {/* Eğer isim varsa göster, yoksa Merkez */}
                                            {p.contactName || (p.type === 'Alış' ? "Merkez" : "-")}
                                        </td>
                                        <td>{p.receiptNo}</td>
                                        <td>{p.personnelName}</td>
                                        <td style={{textAlign:'right', fontWeight:'bold'}}>{p.totalAmount} ₺</td>
                                    </tr>
                                    
                                    {/* DETAY TABLOSU */}
                                    {expandedRowId === p.id && (
                                        <tr style={{backgroundColor:'#fbfbfb'}}>
                                            <td colSpan={7} style={{padding:'15px'}}>
                                                <table className="data-table dense" style={{border:'1px solid #eee', backgroundColor:'white'}}>
                                                    <thead>
                                                        <tr>
                                                            <th>Ürün</th>
                                                            <th>Renk / Ebat</th>
                                                            <th style={{textAlign:'center'}}>Adet</th>
                                                            {/* Sadece Alış ve Sipariş türlerinde durum değiştirilebilir */}
                                                            {p.type !== 'İade' && <th style={{width:'150px'}}>Durum</th>}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {p.items.map((item, idx) => (
                                                            <tr key={idx}>
                                                                <td>{item.productName} <span style={{color:'#999', fontSize:'11px'}}>({item.explanation})</span></td>
                                                                <td>...</td> 
                                                                <td style={{textAlign:'center', fontWeight:'bold'}}>{item.quantity}</td>
                                                                
                                                                {p.type !== 'İade' && (
                                                                    <td>
                                                                        <select 
                                                                            value={item.status} 
                                                                            onChange={(e) => handleStatusChange(p.id!, idx, e.target.value as PurchaseStatus)}
                                                                            className="form-input input-sm"
                                                                            style={{
                                                                                color: 'white',
                                                                                backgroundColor: getStatusColor(item.status),
                                                                                border: 'none',
                                                                                fontWeight: 'bold',
                                                                                cursor: 'pointer'
                                                                            }}
                                                                        >
                                                                            <option value="Beklemede" style={{color:'black'}}>Beklemede</option>
                                                                            <option value="Onaylandı" style={{color:'black'}}>Onaylandı</option>
                                                                            <option value="Üretim" style={{color:'black'}}>Üretim</option>
                                                                            <option value="Sevkiyat" style={{color:'black'}}>Sevkiyat</option>
                                                                            <option value="Tamamlandı" style={{color:'black'}}>Tamamlandı</option>
                                                                        </select>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PurchaseList;