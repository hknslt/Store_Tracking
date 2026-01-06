// src/pages/auth/Login.tsx
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";
import { useNavigate, Link } from "react-router-dom";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate("/"); // Başarılıysa ana sayfaya git
        } catch (err) {
            setError("Giriş başarısız! E-posta veya şifre hatalı.");
        }
    };

    return (
        <div style={containerStyle}>
            <div style={cardStyle}>
                <h2 style={{ textAlign: 'center', color: '#2c3e50' }}>Flexy Mağaza Giriş</h2>
                
                {error && <div style={errorStyle}>{error}</div>}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                        <label style={labelStyle}>E-Posta Adresi</label>
                        <input 
                            type="email" 
                            required
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Şifre</label>
                        <input 
                            type="password" 
                            required
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    
                    <button type="submit" style={buttonStyle}>Giriş Yap</button>
                </form>

                <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px' }}>
                    Yönetici hesabı oluşturmak için <Link to="/register-admin">tıklayın</Link>
                </div>
            </div>
        </div>
    );
};

// Basit CSS stilleri
const containerStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#ecf0f1' };
const cardStyle = { width: '400px', padding: '40px', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' };
const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '14px', color: '#555', fontWeight: 'bold' };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '16px' };
const buttonStyle = { padding: '12px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' };
const errorStyle = { padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '5px', marginBottom: '15px', fontSize: '14px', textAlign: 'center' as 'center' };

export default Login;