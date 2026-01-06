// src/pages/stocks/StockList.tsx
import { useEffect, useState } from "react";
import { getProducts } from "../../services/productService";
import { getAllStocks, saveProductStock } from "../../services/stockService"; // 👈 Stok servisi
import { getGroups, getCategories } from "../../services/definitionService"; 
import type { Product, Group, Category } from "../../types";

const StockList = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Stokları tutacağımız nesne: { "urunId": 50, "urunId2": 10 }
  const [stockMap, setStockMap] = useState<Record<string, number>>({}); 

  const [loading, setLoading] = useState(true);
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pData, gData, cData, stocksData] = await Promise.all([
        getProducts(),
        getGroups(),
        getCategories(),
        getAllStocks() // 👈 Stok tablosunu çektik
      ]);

      setProducts(pData);
      setGroups(gData);
      setCategories(cData);

      // Stok dizisini map'e çeviriyoruz (Hızlı erişim için)
      const mapping: Record<string, number> = {};
      stocksData.forEach((s) => {
          mapping[s.productId] = s.quantity;
      });
      setStockMap(mapping);

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

  // Input değişince local state güncelle
  const handleStockChange = (productId: string, value: string) => {
    setStockMap(prev => ({
        ...prev,
        [productId]: Number(value)
    }));
  };

  // KAYDETME İŞLEMİ
  const handleSave = async (productId: string) => {
    const quantity = stockMap[productId] || 0; 
    
    try {
        await saveProductStock(productId, quantity);
        
        // Başarılı Animasyonu (Yeşil Tık)
        setSuccessId(productId);
        setTimeout(() => setSuccessId(null), 2000);

    } catch (error) {
        console.error("Hata:", error);
    }
  };

  if (loading) return <p>Yükleniyor...</p>;

  return (
    <div>
      <h2 style={{ color: '#2c3e50', marginBottom: '20px' }}>Stok Yönetimi</h2>

      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa', textAlign: 'left', color: '#2c3e50' }}>
            <th style={thStyle}>Ürün Adı</th>
            <th style={thStyle}>Grup / Kategori</th>
            <th style={thStyle}>Mevcut Stok</th>
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

              {/* STOK GİRİŞ ALANI */}
              <td style={tdStyle}>
                <input 
                    type="number" 
                    value={stockMap[p.id!] || 0} 
                    onChange={(e) => handleStockChange(p.id!, e.target.value)}
                    style={{
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        width: '80px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        backgroundColor: (stockMap[p.id!] || 0) < 5 ? '#fff0f0' : 'white', // Az stok varsa hafif kırmızı olsun
                        color: (stockMap[p.id!] || 0) < 5 ? '#c0392b' : '#2c3e50'
                    }}
                /> Adet
              </td>

              {/* KAYDET BUTONU */}
              <td style={tdStyle}>
                <button 
                    onClick={() => p.id && handleSave(p.id)}
                    style={{
                        padding: '8px 15px',
                        backgroundColor: successId === p.id ? '#27ae60' : '#e67e22', // Stok için Turuncu buton kullandım
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        transition: '0.3s'
                    }}
                >
                    {successId === p.id ? "✔ Güncellendi" : "Güncelle"}
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

export default StockList;