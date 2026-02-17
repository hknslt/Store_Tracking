// src/pages/Register.tsx (veya Auth/Register.tsx)
import { useState, useEffect } from "react";
import { createUserWithEmailAndPassword, getAuth, signOut } from "firebase/auth";
import { initializeApp, getApp, deleteApp } from "firebase/app";
import { db } from "../../firebase";
import { doc, setDoc } from "firebase/firestore";
import { getStores } from "../../services/storeService";
import type { Store } from "../../types";
import "./Auth.css";

const Register = () => {
    const [stores, setStores] = useState<Store[]>([]);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [role, setRole] = useState("store_admin");

    const [storeId, setStoreId] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    // Şifre Göster/Gizle State'i
    const [showPassword, setShowPassword] = useState(false);

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
        let secondaryApp;

        try {
            const app = getApp();
            const config = app.options;

            secondaryApp = initializeApp(config, "SecondaryApp");
            const secondaryAuth = getAuth(secondaryApp);

            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
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
            await signOut(secondaryAuth);

            setMessage("✅ Kullanıcı başarıyla oluşturuldu! (Mevcut oturumunuz devam ediyor)");
            setEmail(""); setPassword(""); setFullName(""); setPhone(""); setAddress("");

        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') setError("Bu e-posta adresi zaten kullanımda.");
            else if (err.code === 'auth/weak-password') setError("Şifre en az 6 karakter olmalıdır.");
            else setError("Bir hata oluştu: " + err.message);
        } finally {
            if (secondaryApp) {
                await deleteApp(secondaryApp);
            }
            setLoading(false);
        }
    };

    return (
        <div className="register-container">
            <h2 className="register-title">Yeni Personel / Kullanıcı Ekle</h2>

            {error && <div className="auth-alert alert-error">{error}</div>}
            {message && <div className="auth-alert alert-success">{message}</div>}

            <form onSubmit={handleRegister}>

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
                                <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="form-input" placeholder="İl/İlçe" />
                            </div>
                        </div>
                    </div>
                )}

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
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="form-input"
                                placeholder="******"
                                style={{ paddingRight: '40px' }}
                            />
                            {/* İkon Butonu */}
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                    display: 'flex', alignItems: 'center', color: '#94a3b8'
                                }}
                            >
                                {showPassword ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                )}
                            </button>
                        </div>
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