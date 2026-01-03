// src/pages/products/ProductDetail.tsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getProductById } from "../../services/productService";
import { 
  getGroups, 
  getCategories, 
  getColors, 
  getDimensions, 
  getCushions 
} from "../../services/definitionService";
import type { Product, Group, Category, Color, Dimension, Cushion } from "../../types";

const ProductDetail = () => {
  const { id } = useParams(); // URL'deki ID'yi yakala
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  // İsimleri bulmak için listeler
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [cushions, setCushions] = useState<Cushion[]>([]);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (productId: string) => {
    try {
      const [prod, g, c, col, dim, cush] = await Promise.all([
        getProductById(productId),
        getGroups(),
        getCategories(),
        getColors(),
        getDimensions(),
        getCushions()
      ]);

      setProduct(prod);
      setGroups(g);
      setCategories(c);
      setColors(col);
      setDimensions(dim);
      setCushions(cush);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // İsim Bulucu Fonksiyon
  const getName = (list: any[], id: string | undefined, nameKey: string) => {
    if (!id) return "-";
    const item = list.find(x => x.id === id);
    return item ? item[nameKey] : "Silinmiş Veri";
  };

  if (loading) return <div style={{ padding: 20 }}>Yükleniyor...</div>;
  if (!product) return <div style={{ padding: 20 }}>Ürün bulunamadı!</div>;

  return (
    <div style={{ maxWidth: '800px' }}>
      {/* Üst Başlık ve Geri Butonu */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
         <h2 style={{ margin: 0, color: '#2c3e50' }}>{product.productName}</h2>
         <Link to="/products" style={backBtnStyle}>← Listeye Dön</Link>
      </div>

      {/* Detay Kartı */}
      <div style={cardStyle}>
        
        {/* Üst Bilgiler (Grid Yapısı) */}
        <div style={gridStyle}>
            <div style={itemStyle}>
                <span style={labelStyle}>Grup:</span>
                <span style={valueStyle}>{getName(groups, product.groupId, 'groupName')}</span>
            </div>
            <div style={itemStyle}>
                <span style={labelStyle}>Kategori:</span>
                <span style={valueStyle}>{getName(categories, product.categoryId, 'categoryName')}</span>
            </div>
            <div style={itemStyle}>
                <span style={labelStyle}>Renk:</span>
                <span style={valueStyle}>{getName(colors, product.colorId, 'colorName')}</span>
            </div>
            <div style={itemStyle}>
                <span style={labelStyle}>Minder:</span>
                <span style={valueStyle}>{getName(cushions, product.cushionId, 'cushionName')}</span>
            </div>
            <div style={itemStyle}>
                <span style={labelStyle}>Ebat:</span>
                <span style={valueStyle}>{getName(dimensions, product.dimension, 'dimensionName')}</span>
            </div>
        </div>

        <hr style={{ border: '0', borderTop: '1px solid #eee', margin: '20px 0' }} />

        {/* Açıklama Alanı */}
        <div>
            <h4 style={{ marginTop: 0, color: '#34495e' }}>Ürün Açıklaması</h4>
            <p style={{ lineHeight: '1.6', color: '#555' }}>
                {product.explanation || "Bu ürün için açıklama girilmemiş."}
            </p>
        </div>

      </div>
    </div>
  );
};

// --- STİLLER ---
const cardStyle = { backgroundColor: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' };
const backBtnStyle = { textDecoration: 'none', color: '#3498db', fontWeight: 'bold' };
const gridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' };
const itemStyle = { display: 'flex', flexDirection: 'column' as 'column' };
const labelStyle = { fontSize: '13px', color: '#95a5a6', marginBottom: '5px', fontWeight: 'bold' };
const valueStyle = { fontSize: '16px', color: '#2c3e50', fontWeight: '500' };

export default ProductDetail;   