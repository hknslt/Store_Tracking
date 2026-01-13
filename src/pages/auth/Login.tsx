import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";
import { useNavigate } from "react-router-dom";
import "./Auth.css"; 

// 1. Logonuzu buraya import edin (Dosya yolunu kendi projenize göre düzeltin)
// Eğer assets klasörünüz yoksa src altına açıp logoyu oraya koyabilirsiniz.
import appLogo from "../../assets/logo/Bahçemo_green.png"; 

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate("/"); 
        } catch (err) {
            setError("Giriş başarısız! E-posta veya şifre hatalı.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    {/* 2. Emoji yerine img etiketini kullanıyoruz */}
                    <img src={appLogo} alt="Flexy Logo" className="login-logo" />
                    
                    <h2>Hoş Geldiniz</h2>
                    <p>Flexy Mağaza Yönetim Paneli</p>
                </div>
                
                {error && <div className="auth-alert alert-error">{error}</div>}

                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label className="form-label">E-Posta Adresi</label>
                        <input 
                            type="email" 
                            required
                            className="form-input"
                            placeholder="ornek@flexy.com"
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Şifre</label>
                        <input 
                            type="password" 
                            required
                            className="form-input"
                            placeholder="••••••••"
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    
                    <button type="submit" className="btn-auth" disabled={loading}>
                        {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;