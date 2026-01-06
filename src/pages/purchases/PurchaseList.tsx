// src/pages/purchases/PurchaseList.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPurchases } from "../../services/purchaseService";
import { getProducts } from "../../services/productService"; 
import { getGroups, getCategories, getColors } from "../../services/definitionService";
import type { Purchase, Product, Group, Category, Color } from "../../types";

const PurchaseList = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  // Eşleştirme verileri
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [colors, setColors] = useState<Color[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
        const [purData, prodData, grpData, catData, colData] = await Promise.all([
            getPurchases(),
            getProducts(),
            getGroups(),
            getCategories(),
            getColors()
        ]);
        setPurchases(purData);
        setProducts(prodData);
        setGroups(grpData);
        setCategories(catData);
        setColors(colData);
    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  const getName = (list: any[], id: string, key: string) => {
      const item = list.find(x => x.id === id);
      return item ? item[key] : "-";
  };

  if (loading) return <p>Yükleniyor...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{color: '#2c3e50'}}>Alış Hareketleri</h2>
          <Link to="/purchases/add" style={btnStyle}>+ Yeni Alış Gir</Link>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', fontSize: '14px' }}>
        <thead>
            <tr style={{ backgroundColor: '#ecf0f1', textAlign: 'left', color: '#7f8c8d' }}>
                <th style={thStyle}>Tarih</th>
                <th style={thStyle}>Fiş No</th>
                <th style={thStyle}>Ürün</th>
                <th style={thStyle}>Kategori</th>
                <th style={thStyle}>Renk</th>
                <th style={thStyle}>Adet</th>
                <th style={thStyle}>Tutar</th>
                <th style={thStyle}>Durum</th>
            </tr>
        </thead>
        <tbody>
            {purchases.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={tdStyle}>{p.date}</td>
                    <td style={tdStyle}>{p.receiptNo}</td>
                    <td style={tdStyle}><b>{getName(products, p.productId, 'productName')}</b></td>
                    <td style={tdStyle}>{getName(categories, p.categoryId, 'categoryName')}</td>
                    <td style={tdStyle}>{getName(colors, p.colorId, 'colorName')}</td>
                    <td style={tdStyle}>{p.quantity}</td>
                    <td style={tdStyle}>{p.amount} ₺</td>
                    <td style={tdStyle}>
                        <span style={{
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            backgroundColor: p.status === 'Alış' ? '#e8f8f5' : '#fdedec',
                            color: p.status === 'Alış' ? '#27ae60' : '#c0392b',
                            fontWeight: 'bold'
                        }}>
                            {p.status}
                        </span>
                    </td>
                </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
};

const thStyle = { padding: '12px', borderBottom: '2px solid #bdc3c7' };
const tdStyle = { padding: '12px', color: '#2c3e50' };
const btnStyle = { padding: '10px 15px', backgroundColor: '#27ae60', color: 'white', textDecoration: 'none', borderRadius: '5px', fontWeight: 'bold' };

export default PurchaseList;