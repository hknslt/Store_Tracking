// src/pages/stores/StoreAdd.tsx
import { useState } from "react";
import { addStore } from "../../services/storeService";

const StoreAdd = () => {
    const [formData, setFormData] = useState({
        storeName: "",
        storeCode: "",
        address: "",
        phone: ""
    });
    const [message, setMessage] = useState("");

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.storeName) return;

        try {
            await addStore(formData);
            setMessage("✅ Mağaza Eklendi!");
            setFormData({ storeName: "", storeCode: "", address: "", phone: "" });
            setTimeout(() => setMessage(""), 2000);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div style={{ maxWidth: '600px' }}>
            <h2>Yeni Mağaza / Şube Tanımla</h2>
            {message && <div style={{ padding: '10px', backgroundColor: '#d4edda', color: '#155724', marginBottom: '10px', borderRadius: '5px' }}>{message}</div>}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                    <label style={labelStyle}>Mağaza Adı</label>
                    <input type="text" value={formData.storeName} onChange={e => setFormData({...formData, storeName: e.target.value})} style={inputStyle} placeholder="Mağaza Adı" />
                </div>
                <div>
                    <label style={labelStyle}>Şube Kodu</label>
                    <input type="text" value={formData.storeCode} onChange={e => setFormData({...formData, storeCode: e.target.value})} style={inputStyle} placeholder="M**" />
                </div>
                <div>
                    <label style={labelStyle}>Telefon</label>
                    <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={inputStyle} />
                </div>
                <div>
                    <label style={labelStyle}>Adres</label>
                    <textarea rows={3} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={inputStyle} />
                </div>
                <button type="submit" style={btnStyle}>Kaydet</button>
            </form>
        </div>
    );
};

const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' };
const btnStyle = { padding: '12px', backgroundColor: '#8e44ad', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' };

export default StoreAdd;