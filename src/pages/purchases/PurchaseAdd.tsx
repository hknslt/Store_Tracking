// src/pages/purchases/PurchaseAdd.tsx
import { useState, useEffect } from "react";
import { addPurchase } from "../../services/purchaseService";
// Tanımlama servisleri
import { getGroups, getCategoriesByGroupId, getColors, getDimensions, getCushions } from "../../services/definitionService";
// Ürün servisi (Kategoriye göre ürün çekmek için)
import { getProductsByCategoryId } from "../../services/productService";
import type { Group, Category, Product, Color, Dimension, Cushion, Purchase } from "../../types";

const PurchaseAdd = () => {
  // --- LİSTELER (Dropdownlar için) ---
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [cushions, setCushions] = useState<Cushion[]>([]);

  // --- FORM VERİLERİ ---
  const [formData, setFormData] = useState<Partial<Purchase>>({
    date: new Date().toISOString().split('T')[0], // Bugünün tarihi
    personnel: "",
    receiptNo: "",
    groupId: "",
    categoryId: "",
    productId: "",
    colorId: "",
    cushionId: "",
    dimensionId: "",
    explanation: "",
    quantity: 1,
    amount: 0,
    status: 'Alış'
  });

  const [message, setMessage] = useState("");

  // Sayfa açılınca sabit listeleri (Grup, Renk, Ebat, Minder) çek
  useEffect(() => {
    getGroups().then(setGroups);
    getColors().then(setColors);
    getDimensions().then(setDimensions);
    getCushions().then(setCushions);
  }, []);

  // GRUP DEĞİŞİNCE -> Kategorileri Getir
  const handleGroupChange = async (groupId: string) => {
    setFormData(prev => ({ ...prev, groupId, categoryId: "", productId: "" })); // Alt seçimleri sıfırla
    if (groupId) {
        const cats = await getCategoriesByGroupId(groupId);
        setCategories(cats);
    } else {
        setCategories([]);
    }
  };

  // KATEGORİ DEĞİŞİNCE -> Ürünleri Getir
  const handleCategoryChange = async (categoryId: string) => {
    setFormData(prev => ({ ...prev, categoryId, productId: "" })); // Ürün seçimini sıfırla
    if (categoryId) {
        const prods = await getProductsByCategoryId(categoryId);
        setProducts(prods);
    } else {
        setProducts([]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
     setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId || !formData.amount || !formData.receiptNo) {
        return alert("Lütfen zorunlu alanları doldurunuz (Ürün, Tutar, Fiş No)");
    }

    try {
        await addPurchase(formData as Purchase);
        setMessage("✅ Alış Fişi Kaydedildi!");
        
        // Formu temizle (Tarih ve Personel kalsın kolaylık olsun diye)
        setFormData(prev => ({
            ...prev,
            receiptNo: "",
            productId: "",
            amount: 0,
            quantity: 1,
            explanation: ""
            // Grup ve kategori seçili kalsın mı? İstersen sıfırlayabilirsin.
        }));

        setTimeout(() => setMessage(""), 2000);
    } catch (error) {
        console.error(error);
        alert("Hata oluştu");
    }
  };

  return (
    <div style={{ maxWidth: '800px', backgroundColor: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      <h2 style={{ color: '#2c3e50', marginBottom: '20px' }}>Yeni Alış</h2>

      {message && <div style={successStyle}>{message}</div>}

      <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* --- SOL TARAFTAKİ TEMEL BİLGİLER --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
                <label style={labelStyle}>Tarih</label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
                <label style={labelStyle}>Personel</label>
                <input type="text" name="personnel" placeholder="Personel Adı" value={formData.personnel} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
                <label style={labelStyle}>Fiş / Fatura No</label>
                <input type="text" name="receiptNo" placeholder="Belge No" value={formData.receiptNo} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
                <label style={labelStyle}>İşlem Türü</label>
                <select name="status" value={formData.status} onChange={handleChange as any} style={inputStyle}>
                    <option value="Alış">Alış (Giriş)</option>
                    <option value="İade">İade (Çıkış)</option>
                </select>
            </div>
        </div>

        {/* --- SAĞ TARAFTAKİ ÜRÜN SEÇİMİ --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
            
            {/* 1. GRUP */}
            <div>
                <label style={labelStyle}>Ürün Grubu</label>
                <select 
                    name="groupId" 
                    value={formData.groupId} 
                    onChange={(e) => handleGroupChange(e.target.value)} 
                    style={inputStyle}
                >
                    <option value="">-- Grup Seçiniz --</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.groupName}</option>)}
                </select>
            </div>

            {/* 2. KATEGORİ (Gruba Göre Gelir) */}
            <div>
                <label style={labelStyle}>Kategori</label>
                <select 
                    name="categoryId" 
                    value={formData.categoryId} 
                    onChange={(e) => handleCategoryChange(e.target.value)} 
                    style={inputStyle}
                    disabled={!formData.groupId}
                >
                    <option value="">-- Kategori Seçiniz --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.categoryName}</option>)}
                </select>
            </div>

            {/* 3. ÜRÜN (Kategoriye Göre Gelir) */}
            <div>
                <label style={labelStyle}>Ürün Adı</label>
                <select 
                    name="productId" 
                    value={formData.productId} 
                    onChange={handleChange as any} 
                    style={{...inputStyle, border: '2px solid #3498db'}}
                    disabled={!formData.categoryId}
                >
                    <option value="">-- Ürünü Seçiniz --</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.productName}</option>)}
                </select>
            </div>
        </div>

        {/* --- ALT KISIM: DETAYLAR (Tam Genişlik) --- */}
        <div style={{ gridColumn: 'span 2', display: 'flex', gap: '15px' }}>
            <div style={{ flex: 1 }}>
                <label style={labelStyle}>Renk</label>
                <select name="colorId" value={formData.colorId} onChange={handleChange as any} style={inputStyle}>
                    <option value="">Seçiniz...</option>
                    {colors.map(c => <option key={c.id} value={c.id}>{c.colorName}</option>)}
                </select>
            </div>
            <div style={{ flex: 1 }}>
                <label style={labelStyle}>Ebat</label>
                <select name="dimensionId" value={formData.dimensionId} onChange={handleChange as any} style={inputStyle}>
                    <option value="">Seçiniz...</option>
                    {dimensions.map(d => <option key={d.id} value={d.id}>{d.dimensionName}</option>)}
                </select>
            </div>
            <div style={{ flex: 1 }}>
                <label style={labelStyle}>Minder</label>
                <select name="cushionId" value={formData.cushionId} onChange={handleChange as any} style={inputStyle}>
                    <option value="">Seçiniz...</option>
                    {cushions.map(c => <option key={c.id} value={c.id}>{c.cushionName}</option>)}
                </select>
            </div>
        </div>

        <div style={{ gridColumn: 'span 2', display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1 }}>
                 <label style={labelStyle}>Adet</label>
                 <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
                 <label style={labelStyle}>Tutar (Toplam)</label>
                 <input type="number" name="amount" value={formData.amount} onChange={handleChange} style={{...inputStyle, fontWeight: 'bold'}} />
            </div>
        </div>

        <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Açıklama</label>
            <textarea name="explanation" rows={2} value={formData.explanation} onChange={handleChange} style={inputStyle} />
        </div>

        <div style={{ gridColumn: 'span 2' }}>
            <button type="submit" style={buttonStyle}>Alış Fişini Kaydet</button>
        </div>

      </form>
    </div>
  );
};

// --- STİLLER ---
const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#555' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '14px' };
const buttonStyle = { width: '100%', padding: '15px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' };
const successStyle = { padding: '15px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '5px', marginBottom: '20px', textAlign: 'center' as 'center' };

export default PurchaseAdd;