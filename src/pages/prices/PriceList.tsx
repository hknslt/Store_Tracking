// src/pages/prices/PriceList.tsx
import { useEffect, useState } from "react";
import { getProducts } from "../../services/productService";
import { getAllPrices, saveProductPrice } from "../../services/priceService"; // 👈 Yeni servis
import { getGroups, getCategories } from "../../services/definitionService"; 
import type { Product, Group, Category, Price } from "../../types";

const PriceList = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Fiyatları tutacağımız nesne: { "urunId_1": 1500, "urunId_2": 2000 }
  const [priceMap, setPriceMap] = useState<Record<string, number>>({}); 

  const [loading, setLoading] = useState(true);
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pData, gData, cData, pricesData] = await Promise.all([
        getProducts(),
        getGroups(),
        getCategories(),
        getAllPrices() // 👈 Fiyat tablosunu çektik
      ]);

      setProducts(pData);
      setGroups(gData);
      setCategories(cData);

      // Gelen fiyat dizisini, productId'ye göre kolay erişilebilir bir objeye çeviriyoruz
      const mapping: Record<string, number> = {};
      pricesData.forEach((p) => {
          mapping[p.productId] = p.amount;
      });
      setPriceMap(mapping);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // İsim Bulucu
  const getName = (list: any[], id: string | undefined, nameKey: string) => {
    if (!id) return "-";
    const item = list.find(x => x.id === id);
    return item ? item[nameKey] : ""; 
  };

  // Input değişince sadece local state'i güncelle
  const handlePriceChange = (productId: string, value: string) => {
    setPriceMap(prev => ({
        ...prev,
        [productId]: Number(value)
    }));
  };

  // KAYDETME İŞLEMİ (Servise Gönder)
  const handleSave = async (productId: string) => {
    const amount = priceMap[productId] || 0; // O an kutuda yazan değer
    
    try {
        await saveProductPrice(productId, amount);
        
        // Başarılı Animasyonu
        setSuccessId(productId);
        setTimeout(() => setSuccessId(null), 2000);

    } catch (error) {
        console.error("Hata:", error);
    }
  };

  if (loading) return <p>Yükleniyor...</p>;

  return (
    <div>
      <h2 style={{ color: '#2c3e50', marginBottom: '20px' }}>Fiyat Yönetimi</h2>

      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa', textAlign: 'left', color: '#2c3e50' }}>
            <th style={thStyle}>Ürün Adı</th>
            <th style={thStyle}>Grup / Kategori</th>
            <th style={thStyle}>Fiyat (TL)</th>
            <th style={thStyle}>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={tdStyle}>
                <b>{p.productName}</b>
                <div style={{fontSize: '12px', color: '#999'}}>{p.id}</div>
              </td>
              
              <td style={tdStyle}>
                 {getName(groups, p.groupId, 'groupName')} <br/>
                 <small style={{color:'#7f8c8d'}}>{getName(categories, p.categoryId, 'categoryName')}</small>
              </td>

              {/* FİYAT GİRİŞ ALANI */}
              <td style={tdStyle}>
                <input 
                    type="number" 
                    // priceMap içinden bu ürünün fiyatını bul, yoksa 0 yaz
                    value={priceMap[p.id!] || 0} 
                    onChange={(e) => handlePriceChange(p.id!, e.target.value)}
                    style={{
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        width: '100px',
                        fontWeight: 'bold',
                        textAlign: 'right'
                    }}
                /> ₺
              </td>

              {/* KAYDET BUTONU */}
              <td style={tdStyle}>
                <button 
                    onClick={() => p.id && handleSave(p.id)}
                    style={{
                        padding: '8px 15px',
                        backgroundColor: successId === p.id ? '#27ae60' : '#2980b9', 
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        transition: '0.3s'
                    }}
                >
                    {successId === p.id ? "✔ Kaydedildi" : "Kaydet"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const thStyle = { padding: '15px', borderBottom: '2px solid #e9ecef', fontWeight: '600' };
const tdStyle = { padding: '15px', color: '#555' };

export default PriceList;