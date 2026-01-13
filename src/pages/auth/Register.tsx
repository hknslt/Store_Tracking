import { useState, useEffect } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { getStores } from "../../services/storeService";
import type { Store } from "../../types";
import "./Auth.css"; // CSS dosyasını import et

const Register = () => {
    const navigate = useNavigate();
    const [stores, setStores] = useState<Store[]>([]);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [role, setRole] = useState("store_admin");

    // Mağaza Müdürü Özel Alanları
    const [storeId, setStoreId] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getStores().then(setStores);
    }, []);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setMessage("");

        if (role === 'store_admin' && !storeId) {
            return setError("Mağaza Müdürü için mağaza seçimi zorunludur!");
        }

        setLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const userData = {
                fullName,
                email,
                role,
                isActive: true,
                storeId: role === 'store_admin' ? storeId : null,
                phone: role === 'store_admin' ? phone : "",
                address: role === 'store_admin' ? address : "",
                createdAt: new Date().toISOString()
            };

            await setDoc(doc(db, "personnel", user.uid), userData);

            setMessage("✅ Kullanıcı başarıyla oluşturuldu!");

            // Formu temizle
            setEmail(""); setPassword(""); setFullName(""); setPhone(""); setAddress("");

            // İsterseniz yönlendirme yapabilir veya aynı sayfada yeni kayıt için kalabilirsiniz
            // setTimeout(() => navigate("/personnel"), 2000); 

        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') setError("Bu e-posta adresi zaten kullanımda.");
            else if (err.code === 'auth/weak-password') setError("Şifre en az 6 karakter olmalıdır.");
            else setError("Bir hata oluştu: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        // Bu div 'page-container' içinde render edilecek şekilde tasarlandı
        <div className="register-container">
            <h2 className="register-title">Yeni Personel / Kullanıcı Ekle</h2>

            {error && <div className="auth-alert alert-error">{error}</div>}
            {message && <div className="auth-alert alert-success">{message}</div>}

            <form onSubmit={handleRegister}>

                {/* ROL SEÇİMİ */}
                <div className="form-group">
                    <label className="form-label">Kullanıcı Rolü</label>
                    <select
                        value={role}
                        onChange={e => setRole(e.target.value)}
                        className="form-select"
                        style={{ fontWeight: '600', color: '#4f46e5' }}
                    >
                        <option value="store_admin">Mağaza Müdürü</option>
                        <option value="admin">Sistem Yöneticisi (Admin)</option>
                        <option value="control">Kontrol Personeli</option>
                        <option value="report">Rapor görüntüleyici</option>
                    </select>
                </div>

                {/* MAĞAZA MÜDÜRÜ İÇİN EK ALANLAR */}
                {role === 'store_admin' && (
                    <div className="store-select-box">
                        <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#334155' }}>Mağaza Bilgileri</h4>

                        <div className="form-group">
                            <label className="form-label">Yönettiği Mağaza</label>
                            <select value={storeId} onChange={e => setStoreId(e.target.value)} className="form-select" required>
                                <option value="">-- Mağaza Seçiniz --</option>
                                {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div className="form-group">
                                <label className="form-label">Telefon</label>
                                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="form-input" placeholder="05XX..." required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Adres (Kısa)</label>
                                <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="form-input" placeholder="İlçe/İl" />
                            </div>
                        </div>
                    </div>
                )}

                {/* GENEL BİLGİLER */}
                <div className="form-group">
                    <label className="form-label">Ad Soyad</label>
                    <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="form-input" placeholder="Adı Soyadı" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div className="form-group">
                        <label className="form-label">E-Posta (Giriş için)</label>
                        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="form-input" placeholder="mail@sirket.com" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Şifre</label>
                        <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="form-input" placeholder="******" />
                    </div>
                </div>

                <button type="submit" className="btn-auth" disabled={loading}>
                    {loading ? "Kaydediliyor..." : "Kullanıcıyı Kaydet"}
                </button>
            </form>
        </div>
    );
};

export default Register;