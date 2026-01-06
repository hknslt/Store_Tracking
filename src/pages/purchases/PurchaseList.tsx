// src/pages/purchases/PurchaseList.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

// Servisler (DİKKAT: getPurchasesByStore kullanıyoruz)
import { getPurchasesByStore } from "../../services/purchaseService";
import { getStores } from "../../services/storeService";

import type { Purchase, Store, Personnel } from "../../types";

const PurchaseList = () => {
    const { currentUser } = useAuth();

    // Listeler
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [stores, setStores] = useState<Store[]>([]);

    // Seçimler
    const [selectedStoreId, setSelectedStoreId] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    // 1. Kullanıcı Yetkisini ve Mağazaları Çek
    useEffect(() => {
        const initData = async () => {
            if (!currentUser) return;

            // Mağazaları çek (Dropdown için)
            const storesData = await getStores();
            setStores(storesData);

            // Kullanıcı Rolüne Bak
            const userDoc = await getDoc(doc(db, "personnel", currentUser.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data() as Personnel;

                if (userData.role === 'admin') {
                    setIsAdmin(true);
                    // Adminse başta bir şey seçili gelmesin veya ilk mağaza gelsin
                } else {
                    setIsAdmin(false);
                    // Personelse KENDİ mağazasını seçili yap ve kilitle
                    setSelectedStoreId(userData.storeId);
                }
            }
            setLoading(false);
        };

        initData();
    }, [currentUser]);

    // 2. Mağaza Seçilince (veya otomatik atanınca) Fişleri Çek
    useEffect(() => {
        const loadPurchases = async () => {
            if (!selectedStoreId) {
                setPurchases([]);
                return;
            }

            // YENİ FONKSİYONU KULLANIYORUZ 👇
            const data = await getPurchasesByStore(selectedStoreId);
            setPurchases(data);
        };

        loadPurchases();
    }, [selectedStoreId]);


    if (loading) return <p style={{ padding: 20 }}>Yükleniyor...</p>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ color: '#2c3e50' }}>Alış Fişleri</h2>
                <Link to="/purchases/add" style={btnStyle}>+ Yeni Fiş Gir</Link>
            </div>

            {/* FİLTRELEME ALANI */}
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <label style={{ fontWeight: 'bold', color: '#555' }}>Mağaza Seçiniz:</label>
                    {isAdmin ? (
                        <select
                            value={selectedStoreId}
                            onChange={(e) => setSelectedStoreId(e.target.value)}
                            style={inputStyle}
                        >
                            <option value="">-- Bir Mağaza Seçin --</option>
                            {stores.map(s => (
                                <option key={s.id} value={s.id}>{s.storeName}</option>
                            ))}
                        </select>
                    ) : (
                        // Admin değilse sadece kendi mağazasının adını görsün
                        <div style={{ fontWeight: 'bold', color: '#2980b9' }}>
                            {stores.find(s => s.id === selectedStoreId)?.storeName || "Mağazam"}
                        </div>
                    )}
                </div>
            </div>

            {/* TABLO */}
            {selectedStoreId ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', fontSize: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#ecf0f1', textAlign: 'left', color: '#7f8c8d' }}>
                            <th style={thStyle}>Tarih</th>
                            <th style={thStyle}>Fiş No</th>
                            <th style={thStyle}>Personel</th>
                            <th style={thStyle}>Kalem Sayısı</th>
                            <th style={thStyle}>Toplam Tutar</th>
                            <th style={thStyle}>Detay</th>
                        </tr>
                    </thead>
                    <tbody>
                        {purchases.length > 0 ? (
                            purchases.map(p => (
                                <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={tdStyle}>{p.date}</td>
                                    <td style={tdStyle}><b>{p.receiptNo}</b></td>
                                    <td style={tdStyle}>{p.personnelName}</td>
                                    <td style={tdStyle}>{p.items.length} Ürün</td>
                                    <td style={tdStyle}>{p.totalAmount} ₺</td>
                                    <td style={tdStyle}>
                                        <button style={smallBtnStyle} onClick={() => alert("Detay sayfası yakında yapılacak: " + p.id)}>İncele</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                                    Bu mağazaya ait fiş bulunamadı.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    Lütfen fişleri görmek için bir mağaza seçiniz.
                </div>
            )}
        </div>
    );
};

// Stiller
const thStyle = { padding: '15px', borderBottom: '2px solid #bdc3c7' };
const tdStyle = { padding: '15px', color: '#2c3e50' };
const btnStyle = { padding: '10px 15px', backgroundColor: '#27ae60', color: 'white', textDecoration: 'none', borderRadius: '5px', fontWeight: 'bold' };
const inputStyle = { padding: '10px', borderRadius: '5px', border: '1px solid #ccc', minWidth: '200px' };
const smallBtnStyle = { padding: '5px 10px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' };

export default PurchaseList;