// src/pages/auth/RegisterAdmin.tsx
import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, setDoc } from "firebase/firestore"; // setDoc kullanıyoruz, ID'yi biz belirleyeceğiz
import { useNavigate, Link } from "react-router-dom";

const RegisterAdmin = () => {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password.length < 6) return setError("Şifre en az 6 karakter olmalı.");

        try {
            // 1. Firebase Auth'da kullanıcıyı oluştur
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Firestore'a 'personnel' olarak kaydet (ID = Auth UID)
            // Admin olduğu için storeId boş geçiyoruz veya 'MERKEZ' diyoruz.
            await setDoc(doc(db, "personnel", user.uid), {
                fullName: fullName,
                email: email,
                role: 'admin',      // 👈 ROL SABİT ADMIN
                isActive: true,
                storeId: 'HEAD_OFFICE', // Merkez Ofis kodu
                startDate: new Date().toISOString().split('T')[0],
                phone: "",
                address: ""
            });

            setMessage("✅ Admin hesabı başarıyla oluşturuldu! Yönlendiriliyorsunuz...");
            setTimeout(() => navigate("/"), 2000);

        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError("Bu e-posta adresi zaten kullanımda.");
            } else {
                setError("Kayıt sırasında hata oluştu.");
            }
        }
    };

    return (
        <div style={containerStyle}>
            <div style={cardStyle}>
                <h2 style={{ textAlign: 'center', color: '#2c3e50' }}>Yeni Admin Oluştur</h2>
                
                {error && <div style={errorStyle}>{error}</div>}
                {message && <div style={successStyle}>{message}</div>}

                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                        <label style={labelStyle}>Ad Soyad</label>
                        <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>E-Posta</label>
                        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Şifre</label>
                        <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
                    </div>
                    
                    <button type="submit" style={buttonStyle}>Admin Kaydını Tamamla</button>
                </form>

                <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px' }}>
                    Zaten hesabınız var mı? <Link to="/login">Giriş Yap</Link>
                </div>
            </div>
        </div>
    );
};

// Stiller Login sayfasıyla aynı
const containerStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#2c3e50' }; // Arka plan koyu olsun fark edilsin
const cardStyle = { width: '400px', padding: '40px', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' };
const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '14px', color: '#555', fontWeight: 'bold' };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '16px' };
const buttonStyle = { padding: '12px', backgroundColor: '#e67e22', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' };
const errorStyle = { padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '5px', marginBottom: '15px', fontSize: '14px', textAlign: 'center' as 'center' };
const successStyle = { padding: '10px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '5px', marginBottom: '15px', fontSize: '14px', textAlign: 'center' as 'center' };

export default RegisterAdmin;