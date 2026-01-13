// src/pages/personnel/PersonnelAdd.tsx
import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, addDoc, doc, getDoc } from "firebase/firestore"; // addDoc kullanacağız
import { getStores } from "../../services/storeService";
import { useAuth } from "../../context/AuthContext";
import type { Store, Personnel } from "../../types";

const PersonnelAdd = () => {
    const { currentUser } = useAuth();
    const [stores, setStores] = useState<Store[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [userStoreId, setUserStoreId] = useState(""); // Müdürün mağazası

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    // Form Verileri (Email/Şifre YOK)
    const [formData, setFormData] = useState({
        fullName: "",
        storeId: "",
        role: "staff", // Sabit
        isActive: true,
        startDate: new Date().toISOString().split('T')[0],
        phone: "",
        address: ""
    });

    useEffect(() => {
        const init = async () => {
            // Mağazaları çek
            const sData = await getStores();
            setStores(sData);

            // Mevcut kullanıcının rolünü kontrol et
            if (currentUser) {
                const userDoc = await getDoc(doc(db, "personnel", currentUser.uid));
                if (userDoc.exists()) {
                    const uData = userDoc.data();
                    if (uData.role === 'admin') {
                        setIsAdmin(true);
                    } else if (uData.role === 'store_admin') {
                        setIsAdmin(false);
                        setUserStoreId(uData.storeId);
                        // Formdaki mağazayı otomatik seç
                        setFormData(prev => ({ ...prev, storeId: uData.storeId }));
                    }
                }
            }
        };
        init();
    }, [currentUser]);

    const handleChange = (e: any) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setMessage("");

        if (!formData.fullName || !formData.storeId) {
            return setError("İsim ve Mağaza seçimi zorunludur!");
        }

        try {
            // Veritabanına Ekle (Auth yok)
            // 'personnel' koleksiyonuna ekliyoruz ama ID otomatik oluşacak
            await addDoc(collection(db, "personnel"), {
                ...formData,
                role: 'staff', // Kesinlikle staff
                createdAt: new Date().toISOString()
            });

            setMessage("✅ Personel başarıyla kaydedildi!");
            
            // Temizle (Mağaza ID admin değilse sabit kalsın)
            setFormData(prev => ({
                ...prev,
                fullName: "",
                phone: "",
                address: "",
                storeId: isAdmin ? "" : userStoreId 
            }));

            setTimeout(() => setMessage(""), 3000);

        } catch (err: any) {
            console.error(err);
            setError("Hata oluştu: " + err.message);
        }
    };

    return (
        <div style={{ maxWidth: '700px', margin:'0 auto' }}>
            <div className="card" style={{padding:'30px'}}>
                <h2 style={{marginTop:0, borderBottom:'1px solid #eee', paddingBottom:'10px'}}>Yeni Personel Ekle</h2>
                <p style={{color:'#7f8c8d', fontSize:'13px', marginBottom:'20px'}}>
                    Buradan eklenen personeller sisteme <b>giriş yapamazlar</b>. Sadece puantaj ve satış işlemlerinde seçilebilirler.
                </p>

                {message && <div style={successStyle}>{message}</div>}
                {error && <div style={errorStyle}>{error}</div>}

                <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                    {/* MAĞAZA SEÇİMİ */}
                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={labelStyle}>Çalışacağı Mağaza</label>
                        {isAdmin ? (
                            <select name="storeId" value={formData.storeId} onChange={handleChange} style={inputStyle} required>
                                <option value="">-- Mağaza Seçiniz --</option>
                                {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                            </select>
                        ) : (
                            // Müdür ise sadece kendi mağazası görünür (Readonly input)
                            <input 
                                type="text" 
                                value={stores.find(s => s.id === userStoreId)?.storeName || "Mağazam"} 
                                disabled 
                                style={{...inputStyle, backgroundColor:'#eee'}} 
                            />
                        )}
                    </div>

                    <div>
                        <label style={labelStyle}>Adı Soyadı</label>
                        <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} style={inputStyle} required />
                    </div>

                    <div>
                        <label style={labelStyle}>İşe Başlama Tarihi</label>
                        <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} style={inputStyle} />
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={labelStyle}>Telefon</label>
                        <input type="text" name="phone" value={formData.phone} onChange={handleChange} style={inputStyle} />
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={labelStyle}>Adres</label>
                        <textarea name="address" rows={2} value={formData.address} onChange={handleChange} style={inputStyle} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} style={{ width: '20px', height: '20px' }} />
                        <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Aktif Çalışan</label>
                    </div>

                    <div style={{ gridColumn: 'span 2', marginTop:'10px' }}>
                        <button type="submit" style={btnStyle}>Personeli Kaydet</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Stiller
const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px', color: '#555' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' };
const btnStyle = { width: '100%', padding: '12px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', fontSize:'16px' };
const successStyle = { padding: '10px', backgroundColor: '#d4edda', color: '#155724', marginBottom: '10px', borderRadius: '5px' };
const errorStyle = { padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', marginBottom: '10px', borderRadius: '5px' };

export default PersonnelAdd;