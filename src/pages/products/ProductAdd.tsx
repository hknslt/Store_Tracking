// src/pages/products/ProductAdd.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { addProduct } from "../../services/productService";
// Tüm tanımlama servislerini çağırıyoruz
import { 
  getGroups, 
  getCategoriesByGroupId, 
  getColors, 
  getDimensions, 
  getCushions 
} from "../../services/definitionService"; 
import type { Product, Group, Category, Color, Dimension, Cushion } from "../../types";

const ProductAdd = () => {
  const navigate = useNavigate();

  // Tüm listeleri tutacak stateler
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [cushions, setCushions] = useState<Cushion[]>([]);

  const [formData, setFormData] = useState<Partial<Product>>({
    productName: "",
    groupId: "",
    categoryId: "",
    colorId: "",
    cushionId: "",
    dimension: "", // Dikkat: Type dosyasında dimensionId olarak değiştirmediysek burada string kalabilir, ama biz ID yapacağız.
    explanation: ""
  });

  // Sayfa açılınca GENEL listeleri çek
  useEffect(() => {
    getGroups().then(setGroups);
    getColors().then(setColors);
    getDimensions().then(setDimensions);
    getCushions().then(setCushions);
  }, []);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Grup değişince Kategori listesini güncelle
    if (name === "groupId") {
      setFormData((prev) => ({ ...prev, groupId: value, categoryId: "" }));
      if (value) {
        const filteredCats = await getCategoriesByGroupId(value);
        setCategories(filteredCats);
      } else {
        setCategories([]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Zorunlu alan kontrolü (Hepsini ID olarak kontrol ediyoruz)
    if (!formData.productName || !formData.groupId || !formData.categoryId || !formData.colorId || !formData.cushionId) {
      alert("Lütfen tüm seçimleri yapınız!");
      return;
    }

    try {
      await addProduct(formData as Product);
      alert("Ürün başarıyla kaydedildi!");
      navigate("/products");
    } catch (error) {
      alert("Hata oluştu!");
    }
  };

  return (
    <div style={{ maxWidth: '700px', backgroundColor: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>Yeni Ürün Tanımla</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

        {/* 1. GRUP SEÇİMİ */}
        <div>
          <label style={labelStyle}>Ürün Grubu</label>
          <select name="groupId" value={formData.groupId} onChange={handleChange} style={inputStyle}>
            <option value="">-- Grup Seçiniz --</option>
            {groups.map(g => (<option key={g.id} value={g.id}>{g.groupName}</option>))}
          </select>
        </div>

        {/* 2. KATEGORİ SEÇİMİ */}
        <div>
          <label style={labelStyle}>Kategori</label>
          <select name="categoryId" value={formData.categoryId} onChange={handleChange} style={inputStyle} disabled={!formData.groupId}>
            <option value="">-- Kategori Seçiniz --</option>
            {categories.map(c => (<option key={c.id} value={c.id}>{c.categoryName}</option>))}
          </select>
        </div>

        {/* 3. ÜRÜN ADI */}
        <div>
          <label style={labelStyle}>Ürün Adı</label>
          <input name="productName" placeholder="Ürün Adı" value={formData.productName} onChange={handleChange} style={inputStyle} />
        </div>

        {/* 4. RENK ve MİNDER (Yan Yana) */}
        <div style={{ display: 'flex', gap: '15px' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Renk</label>
            <select name="colorId" value={formData.colorId} onChange={handleChange} style={inputStyle}>
              <option value="">-- Renk Seç --</option>
              {colors.map(c => (<option key={c.id} value={c.id}>{c.colorName}</option>))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Minder Tipi</label>
            <select name="cushionId" value={formData.cushionId} onChange={handleChange} style={inputStyle}>
              <option value="">-- Minder Seç --</option>
              {cushions.map(c => (<option key={c.id} value={c.id}>{c.cushionName}</option>))}
            </select>
          </div>
        </div>

        {/* 5. EBAT (Selectbox oldu) */}
        <div>
          <label style={labelStyle}>Ebat / Ölçü</label>
          <select name="dimension" value={formData.dimension} onChange={handleChange} style={inputStyle}>
            <option value="">-- Ölçü Seçiniz --</option>
            {dimensions.map(d => (<option key={d.id} value={d.id}>{d.dimensionName}</option>))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Açıklama</label>
          <textarea name="explanation" value={formData.explanation} onChange={handleChange} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        <button type="submit" style={buttonStyle}>Ürünü Kaydet</button>
      </form>
    </div>
  );
};

const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#34495e' };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '14px', backgroundColor: '#fff', color: '#333' };
const buttonStyle = { padding: '12px', backgroundColor: '#2980b9', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' };

export default ProductAdd;