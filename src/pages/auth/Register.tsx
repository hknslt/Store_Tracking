// src/pages/Register.tsx (veya Auth/Register.tsx)
import { useState, useEffect } from "react";
import { createUserWithEmailAndPassword, getAuth, signOut } from "firebase/auth";
import { initializeApp, getApp, deleteApp } from "firebase/app"; // 🔥 Yeni importlar
import { db } from "../../firebase"; // Mevcut db bağlantısı (Admin yetkisi için)
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
        let secondaryApp;

        try {
            // 1. Mevcut Firebase konfigürasyonunu al
            const app = getApp();
            const config = app.options;

            // 2. Geçici bir "İkincil" Firebase uygulaması başlat
            // Bu sayede yeni kullanıcı oluşsa bile ana 'auth' oturumu değişmez.
            secondaryApp = initializeApp(config, "SecondaryApp");
            const secondaryAuth = getAuth(secondaryApp);

            // 3. Yeni kullanıcıyı bu ikincil auth üzerinden oluştur
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            const user = userCredential.user;

            // 4. Firestore'a kaydet (Ana 'db' bağlantısını kullanıyoruz ki Admin yetkisiyle yazabilelim)
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

            // ÖNEMLİ: Auth ID ile Firestore ID'yi eşliyoruz
            await setDoc(doc(db, "personnel", user.uid), userData);

            // 5. Oluşturulan kullanıcının oturumunu ikincil app'ten kapat (Garanti olsun)
            await signOut(secondaryAuth);

            setMessage("✅ Kullanıcı başarıyla oluşturuldu! (Mevcut oturumunuz devam ediyor)");

            // Formu temizle
            setEmail(""); setPassword(""); setFullName(""); setPhone(""); setAddress("");

        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') setError("Bu e-posta adresi zaten kullanımda.");
            else if (err.code === 'auth/weak-password') setError("Şifre en az 6 karakter olmalıdır.");
            else setError("Bir hata oluştu: " + err.message);
        } finally {
            // 6. İkincil uygulamayı bellekten sil
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
                                <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="form-input" placeholder="İl/İlçe" />
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