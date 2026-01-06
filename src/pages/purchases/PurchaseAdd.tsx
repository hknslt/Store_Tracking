// src/pages/purchases/PurchaseAdd.tsx
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore"; // Kullanıcı detayı için

import { addPurchase } from "../../services/purchaseService";
import { getGroups, getCategoriesByGroupId, getColors, getDimensions, getCushions } from "../../services/definitionService";
import { getProductsByCategoryId } from "../../services/productService";
import { getStores } from "../../services/storeService";

import type { Group, Category, Product, Color, Dimension, Cushion, PurchaseItem, Store, Personnel } from "../../types";

const PurchaseAdd = () => {
    const { currentUser } = useAuth();

    // --- LİSTELER ---
    const [stores, setStores] = useState<Store[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [colors, setColors] = useState<Color[]>([]);
    const [dimensions, setDimensions] = useState<Dimension[]>([]);
    const [cushions, setCushions] = useState<Cushion[]>([]);

    // --- KULLANICI & YETKİ ---
    const [currentPersonnel, setCurrentPersonnel] = useState<Personnel | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    // --- FİŞ BAŞLIĞI VERİLERİ ---
    const [headerData, setHeaderData] = useState({
        date: new Date().toISOString().split('T')[0],
        receiptNo: "",
        storeId: "" // Seçilen veya atanan mağaza
    });

    // --- EKLENECEK SATIR (Geçici) ---
    const [lineItem, setLineItem] = useState<Partial<PurchaseItem>>({
        groupId: "", categoryId: "", productId: "", productName: "",
        colorId: "", cushionId: "", dimensionId: "",
        quantity: 1, amount: 0, explanation: "", status: 'Alış'
    });

    // --- EKLENMİŞ LİSTE ---
    const [addedItems, setAddedItems] = useState<PurchaseItem[]>([]);
    const [message, setMessage] = useState("");

    // 1. Sayfa Yüklenince: Tanımları ve Kullanıcıyı Çek
    useEffect(() => {
        const initData = async () => {
            // Tanımlar
            getGroups().then(setGroups);
            getColors().then(setColors);
            getDimensions().then(setDimensions);
            getCushions().then(setCushions);

            // Giriş Yapan Kullanıcı Detayı
            if (currentUser) {
                const userDoc = await getDoc(doc(db, "personnel", currentUser.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data() as Personnel;
                    setCurrentPersonnel(userData);

                    if (userData.role === 'admin') {
                        setIsAdmin(true);
                        getStores().then(setStores); // Admin ise mağazaları getir
                    } else {
                        // Admin değilse kendi mağazasını ata
                        setIsAdmin(false);
                        setHeaderData(prev => ({ ...prev, storeId: userData.storeId }));
                    }
                }
            }
        };
        initData();
    }, [currentUser]);

    // --- HANDLERS ---

    const handleHeaderChange = (e: any) => {
        setHeaderData({ ...headerData, [e.target.name]: e.target.value });
    };

    const handleLineChange = (e: any) => {
        setLineItem({ ...lineItem, [e.target.name]: e.target.value });
    };

    // Grup değişince
    const handleGroupChange = async (groupId: string) => {
        setLineItem(prev => ({ ...prev, groupId, categoryId: "", productId: "" }));
        if (groupId) {
            const cats = await getCategoriesByGroupId(groupId);
            setCategories(cats);
        } else {
            setCategories([]);
        }
    };

    // Kategori değişince
    const handleCategoryChange = async (categoryId: string) => {
        setLineItem(prev => ({ ...prev, categoryId, productId: "" }));
        if (categoryId) {
            const prods = await getProductsByCategoryId(categoryId);
            setProducts(prods);
        } else {
            setProducts([]);
        }
    };

    // Ürün değişince (İsmini de alalım)
    const handleProductChange = (productId: string) => {
        const prod = products.find(p => p.id === productId);
        setLineItem(prev => ({
            ...prev,
            productId,
            productName: prod ? prod.productName : ""
        }));
    };

    // LİSTEYE EKLE BUTONU
    const addLineItem = () => {
        if (!lineItem.productId || !lineItem.quantity || !lineItem.amount) {
            return alert("Lütfen ürün, adet ve tutar giriniz.");
        }

        // Listeye ekle
        setAddedItems([...addedItems, lineItem as PurchaseItem]);

        // Formu temizle (Grup/Kat kalsın kolaylık olsun)
        setLineItem(prev => ({
            ...prev,
            quantity: 1,
            amount: 0,
            explanation: ""
        }));
    };

    // SATIR SİL
    const removeLineItem = (index: number) => {
        const newList = [...addedItems];
        newList.splice(index, 1);
        setAddedItems(newList);
    };

    // KAYDET BUTONU (Tüm Fişi)
    const saveReceipt = async () => {
        // 1. KONTROL: Veriler Dolu mu?
        if (!headerData.storeId) {
            return alert("HATA: Mağaza seçilmedi! (storeId eksik)");
        }
        if (!headerData.receiptNo) {
            return alert("HATA: Fiş numarası girilmedi!");
        }
        if (addedItems.length === 0) {
            return alert("HATA: Listeye hiç ürün eklenmedi!");
        }

        // 2. KONTROL: Eklenen ürünlerde eksik ID var mı?
        const invalidItem = addedItems.find(item => !item.productId);
        if (invalidItem) {
            return alert("HATA: Listede ID'si olmayan bozuk bir ürün var!");
        }

        // Toplam Tutar Hesapla
        const totalAmount = addedItems.reduce((sum, item) => sum + Number(item.amount), 0);

        const purchaseData = {
            storeId: headerData.storeId,
            date: headerData.date,
            receiptNo: headerData.receiptNo,
            personnelId: currentUser?.uid || "unknown",
            personnelName: currentPersonnel?.fullName || "Bilinmiyor",
            items: addedItems,
            totalAmount: totalAmount,
            createdAt: new Date()
        };

        // KONSOLA YAZ (F12 -> Console sekmesinden bakabilirsin)
        console.log("Gönderilecek Veri:", purchaseData);

        try {
            await addPurchase(purchaseData);
            setMessage("✅ Alış Fişi ve Stoklar Kaydedildi!");
            
            // Temizlik
            setAddedItems([]);
            setHeaderData(prev => ({ ...prev, receiptNo: "" }));
            
            setTimeout(() => setMessage(""), 3000);
        } catch (error: any) {
            // HATAYI EKRANA BASALIM
            console.error("Firebase Hatası:", error);
            alert("KAYIT BAŞARISIZ OLDU!\n\nHata Detayı: " + error.message);
        }
    };

    return (
        <div>
            <h2 style={{ color: '#2c3e50', marginBottom: '20px' }}>Yeni Mal Kabul / İade Fişi</h2>

            {message && <div style={successStyle}>{message}</div>}

            {/* --- 1. FİŞ BAŞLIĞI --- */}
            <div style={cardStyle}>
                <h4 style={sectionTitle}>Fiş Bilgileri</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>

                    <div>
                        <label style={labelStyle}>Tarih</label>
                        <input type="date" name="date" value={headerData.date} onChange={handleHeaderChange} style={inputStyle} />
                    </div>

                    <div>
                        <label style={labelStyle}>Mağaza</label>
                        {isAdmin ? (
                            <select name="storeId" value={headerData.storeId} onChange={handleHeaderChange} style={inputStyle}>
                                <option value="">-- Mağaza Seç --</option>
                                {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                            </select>
                        ) : (
                            <input type="text" value={currentPersonnel ? "📍 Kendi Mağazam" : "Yükleniyor..."} disabled style={{ ...inputStyle, backgroundColor: '#eee' }} />
                        )}
                    </div>

                    <div>
                        <label style={labelStyle}>Personel</label>
                        <input type="text" value={currentPersonnel?.fullName || ""} disabled style={{ ...inputStyle, backgroundColor: '#eee' }} />
                    </div>

                    <div>
                        <label style={labelStyle}>Fiş / Belge No</label>
                        <input type="text" name="receiptNo" value={headerData.receiptNo} onChange={handleHeaderChange} style={inputStyle} placeholder="Örn: IRS-2024-001" />
                    </div>
                </div>
            </div>

            {/* --- 2. ÜRÜN EKLEME PANELİ --- */}
            <div style={{ ...cardStyle, marginTop: '20px', borderLeft: '5px solid #3498db' }}>
                <h4 style={sectionTitle}>Ürün Ekle</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>

                    {/* Grup - Kategori - Ürün */}
                    <select value={lineItem.groupId} onChange={e => handleGroupChange(e.target.value)} style={inputStyle}>
                        <option value="">Grup Seç...</option>
                        {groups.map(g => <option key={g.id} value={g.id}>{g.groupName}</option>)}
                    </select>

                    <select value={lineItem.categoryId} onChange={e => handleCategoryChange(e.target.value)} style={inputStyle} disabled={!lineItem.groupId}>
                        <option value="">Kategori Seç...</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.categoryName}</option>)}
                    </select>

                    <select value={lineItem.productId} onChange={e => handleProductChange(e.target.value)} style={{ ...inputStyle, fontWeight: 'bold' }} disabled={!lineItem.categoryId}>
                        <option value="">Ürün Seç...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.productName}</option>)}
                    </select>

                    {/* Özellikler */}
                    <select name="colorId" value={lineItem.colorId} onChange={handleLineChange} style={inputStyle}>
                        <option value="">Renk...</option>
                        {colors.map(c => <option key={c.id} value={c.id}>{c.colorName}</option>)}
                    </select>

                    <select name="dimensionId" value={lineItem.dimensionId} onChange={handleLineChange} style={inputStyle}>
                        <option value="">Ebat...</option>
                        {dimensions.map(d => <option key={d.id} value={d.id}>{d.dimensionName}</option>)}
                    </select>

                    <select name="cushionId" value={lineItem.cushionId} onChange={handleLineChange} style={inputStyle}>
                        <option value="">Minder...</option>
                        {cushions.map(c => <option key={c.id} value={c.id}>{c.cushionName}</option>)}
                    </select>

                    {/* Adet - Tutar - Durum */}
                    <input type="number" name="quantity" placeholder="Adet" value={lineItem.quantity} onChange={handleLineChange} style={inputStyle} />
                    <input type="number" name="amount" placeholder="Tutar" value={lineItem.amount} onChange={handleLineChange} style={inputStyle} />

                    <select name="status" value={lineItem.status} onChange={handleLineChange} style={{ ...inputStyle, color: lineItem.status === 'Alış' ? 'green' : 'red' }}>
                        <option value="Alış">Alış (Giriş)</option>
                        <option value="İade">İade (Müşteriden)</option>
                    </select>

                    <input type="text" name="explanation" placeholder="Açıklama" value={lineItem.explanation} onChange={handleLineChange} style={{ gridColumn: 'span 3', ...inputStyle }} />

                </div>
                <button onClick={addLineItem} style={addBtnStyle}>+ Listeye Ekle</button>
            </div>

            {/* --- 3. EKLENEN LİSTE --- */}
            <div style={{ marginTop: '20px' }}>
                <h4 style={{ color: '#2c3e50' }}>Eklenecek Ürünler ({addedItems.length})</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#ecf0f1', textAlign: 'left', fontSize: '13px' }}>
                            <th style={thStyle}>Ürün</th>
                            <th style={thStyle}>Özellikler</th>
                            <th style={thStyle}>Durum</th>
                            <th style={thStyle}>Adet</th>
                            <th style={thStyle}>Tutar</th>
                            <th style={thStyle}>İşlem</th>
                        </tr>
                    </thead>
                    <tbody>
                        {addedItems.map((item, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={tdStyle}>{item.productName}</td>
                                <td style={tdStyle}><small>RenkID:{item.colorId}, EbatID:{item.dimensionId}</small></td>
                                <td style={tdStyle}>
                                    <span style={{ color: item.status === 'Alış' ? 'green' : 'red', fontWeight: 'bold' }}>{item.status}</span>
                                </td>
                                <td style={tdStyle}>{item.quantity}</td>
                                <td style={tdStyle}>{item.amount} ₺</td>
                                <td style={tdStyle}>
                                    <button onClick={() => removeLineItem(index)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Sil</button>
                                </td>
                            </tr>
                        ))}
                        {addedItems.length === 0 && <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: '#999' }}>Henüz ürün eklenmedi.</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* --- GENEL TOPLAM VE KAYDET --- */}
            {addedItems.length > 0 && (
                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                    <h3 style={{ margin: '10px 0' }}>Genel Toplam: {addedItems.reduce((a, b) => a + Number(b.amount), 0)} ₺</h3>
                    <button onClick={saveReceipt} style={saveBtnStyle}>✅ FİŞİ KAYDET VE STOKLARI GÜNCELLE</button>
                </div>
            )}
        </div>
    );
};

// --- STİLLER ---
const cardStyle = { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
const sectionTitle = { marginTop: 0, marginBottom: '15px', color: '#7f8c8d', borderBottom: '1px solid #eee', paddingBottom: '10px' };
const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '5px' };
const inputStyle = { width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' };
const addBtnStyle = { marginTop: '15px', width: '100%', padding: '10px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' };
const saveBtnStyle = { padding: '15px 30px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' };
const successStyle = { padding: '15px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '5px', marginBottom: '20px', textAlign: 'center' as 'center' };
const thStyle = { padding: '10px', borderBottom: '2px solid #ddd' };
const tdStyle = { padding: '10px', color: '#333' };

export default PurchaseAdd;