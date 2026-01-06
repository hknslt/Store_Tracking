// src/pages/products/ProductDetail.tsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getProductById } from "../../services/productService";
import { getGroups, getCategories, getColors, getDimensions } from "../../services/definitionService";
import type { Product, Group, Category, Color, Dimension } from "../../types";

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (productId: string) => {
    try {
      const [prod, g, c, col, dim] = await Promise.all([
        getProductById(productId),
        getGroups(),
        getCategories(),
        getColors(),
        getDimensions()
      ]);
      setProduct(prod);
      setGroups(g);
      setCategories(c);
      setColors(col);
      setDimensions(dim);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getName = (list: any[], id: string | undefined | null, nameKey: string) => {
    if (!id) return "-";
    const item = list.find(x => x.id === id);
    return item ? item[nameKey] : "Silinmiş";
  };

  if (loading) return <div>Yükleniyor...</div>;
  if (!product) return <div>Ürün bulunamadı!</div>;

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
         <h2 style={{ margin: 0, color: '#2c3e50' }}>{product.productName}</h2>
         <Link to="/products" style={{ textDecoration: 'none', color: '#3498db', fontWeight: 'bold' }}>← Listeye Dön</Link>
      </div>

      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div><span style={labelStyle}>Grup:</span> <span style={valueStyle}>{getName(groups, product.groupId, 'groupName')}</span></div>
            <div><span style={labelStyle}>Kategori:</span> <span style={valueStyle}>{getName(categories, product.categoryId, 'categoryName')}</span></div>
            <div><span style={labelStyle}>Renk:</span> <span style={valueStyle}>{getName(colors, product.colorId, 'colorName')}</span></div>
            <div><span style={labelStyle}>Ebat:</span> <span style={valueStyle}>{getName(dimensions, product.dimensionId, 'dimensionName')}</span></div>
        </div>

        <hr style={{ border: '0', borderTop: '1px solid #eee', margin: '20px 0' }} />

        <div>
            <h4 style={{ marginTop: 0, color: '#34495e' }}>Açıklama</h4>
            <p style={{ lineHeight: '1.6', color: '#555' }}>{product.explanation || "Açıklama yok."}</p>
        </div>
      </div>
    </div>
  );
};

const labelStyle = { fontSize: '13px', color: '#95a5a6', fontWeight: 'bold', display:'block', marginBottom:'4px' };
const valueStyle = { fontSize: '16px', color: '#2c3e50', fontWeight: '500' };

export default ProductDetail;