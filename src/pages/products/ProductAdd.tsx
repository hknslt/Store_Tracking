// src/pages/products/ProductAdd.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { addProduct } from "../../services/productService";
import { getGroups } from "../../services/definitionService"; // <-- Grup servisini çağırdık
import type { Product, Group } from "../../types"; // <-- Group tipini ekledik

const ProductAdd = () => {
  const navigate = useNavigate();

  // Grupları tutacağımız state
  const [groups, setGroups] = useState<Group[]>([]);

  const [formData, setFormData] = useState<Partial<Product>>({
    productName: "",
    groupId: "",
    categoryId: "",
    colorId: "",
    cushionId: "",
    dimension: "",
    explanation: ""
  });

  // Sayfa açılınca Grupları veritabanından çek
  useEffect(() => {
    getGroups().then(data => setGroups(data));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.productName || !formData.groupId) {
      alert("Lütfen ürün adını ve grubunu seçiniz!");
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
    <div style={{ maxWidth: '600px', backgroundColor: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>Yeni Ürün Tanımla</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

        {/* GRUP SEÇİMİ - ARTIK SELECTBOX */}
        <div>
          <label style={labelStyle}>Ürün Grubu</label>
          <select
            name="groupId"
            value={formData.groupId}
            onChange={handleChange}
            style={inputStyle}
          >
            <option value="">-- Bir Grup Seçiniz --</option>
            {groups.map(g => (
              // Burada value olarak ID'yi gönderiyoruz ama ekranda İsmi gösteriyoruz
              <option key={g.id} value={g.id}>{g.groupName}</option>
            ))}
          </select>
        </div>

        {/* ŞİMDİLİK DİĞERLERİ MANUEL KALSIN (Sonra onları da böyle yapacağız) */}
        <div>
          <label style={labelStyle}>Kategori ID</label>
          <input name="categoryId" placeholder="Kategori ID" value={formData.categoryId} onChange={handleChange} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>Ürün Adı</label>
          <input name="productName" placeholder="Ürün Adı" value={formData.productName} onChange={handleChange} style={inputStyle} />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Renk ID</label>
            <input name="colorId" value={formData.colorId} onChange={handleChange} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Minder ID</label>
            <input name="cushionId" value={formData.cushionId} onChange={handleChange} style={inputStyle} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Ölçüler</label>
          <input name="dimension" placeholder="Örn: 200x90x75" value={formData.dimension} onChange={handleChange} style={inputStyle} />
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
const inputStyle = { width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '14px', backgroundColor: '#fff', color: '#333' };
const buttonStyle = { padding: '12px', backgroundColor: '#2980b9', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' };

export default ProductAdd;