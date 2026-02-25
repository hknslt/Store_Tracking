// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc, collection, addDoc, query, where, getDocs } from "firebase/firestore";
import type { SystemUser } from "../types";

interface AuthContextType {
    currentUser: User | null;
    userData: SystemUser | null;
    userRole: string | null;
    loading: boolean;
    logout: () => Promise<void>; // Çıkış yapma fonksiyonu
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<SystemUser | null>(null);
    const [loading, setLoading] = useState(true);

    //   KENDİ MESAJ SİSTEMİMİZ İÇİN STATE
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    // Mesajı 5 saniye sonra otomatik kapat
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    // 1. Kullanıcı verisini users tablosundan çek 
                    let userDoc = await getDoc(doc(db, "users", user.uid));
                    if (!userDoc.exists()) {
                        userDoc = await getDoc(doc(db, "personnel", user.uid));
                    }

                    if (userDoc.exists()) {
                        const data = userDoc.data() as SystemUser;

                        // 2. ADMİN DEĞİLSE CİHAZ KONTROLÜ YAP
                        if (!['admin', 'control', 'report'].includes(data.role)) {

                            // Electron köprüsünden Machine ID'yi al
                            let machineId = "UNKNOWN";
                            if (window.electronAPI && window.electronAPI.getMachineId) {
                                machineId = await window.electronAPI.getMachineId();
                            }

                            // Kullanıcının izinli cihazları listesinde bu cihaz var mı?
                            const allowedDevices = data.allowedDevices || [];

                            if (!allowedDevices.includes(machineId)) {
                                // CİHAZ İZİNSİZ! Onay isteği var mı diye kontrol et
                                const reqQuery = query(
                                    collection(db, "device_requests"),
                                    where("personnelId", "==", user.uid),
                                    where("deviceId", "==", machineId)
                                );
                                const reqSnap = await getDocs(reqQuery);

                                // Eğer daha önce istek atılmamışsa, yeni istek at
                                if (reqSnap.empty) {
                                    await addDoc(collection(db, "device_requests"), {
                                        storeId: data.storeId || "",
                                        personnelId: user.uid,
                                        personnelName: data.fullName,
                                        deviceId: machineId,
                                        status: 'pending',
                                        requestedAt: new Date().toISOString()
                                    });
                                }

                                // Kullanıcıyı sistemden AT ve ÖZEL BİLDİRİM GÖSTER!
                                await signOut(auth);
                                setMessage({
                                    type: 'error',
                                    text: `Bu cihaz sisteme kayıtlı değil!\nCihaz Kodunuz: ${machineId}\n\nLütfen yöneticinize cihazınızı onaylatınız.`
                                });
                                setCurrentUser(null);
                                setUserData(null);
                                setLoading(false);
                                return; // İşlemi durdur, içeri alma!
                            }
                        }

                        // Cihaz onaylıysa veya Admin ise İçeri Al
                        setUserData(data);
                        setCurrentUser(user);
                    } else {
                        // Belge yoksa at
                        await signOut(auth);
                        setCurrentUser(null);
                    }
                } catch (error) {
                    console.error("Kullanıcı verisi çekilemedi veya Cihaz Hatası:", error);
                    await signOut(auth);
                    setCurrentUser(null);
                }
            } else {
                // Kullanıcı çıkış yapmışsa state'leri sıfırla
                setCurrentUser(null);
                setUserData(null);
            }

            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const logout = async () => {
        await signOut(auth);
        setCurrentUser(null);
        setUserData(null);
    };

    const values = {
        currentUser,
        userData,
        userRole: userData?.role || null,
        loading,
        logout
    };

    return (
        <AuthContext.Provider value={values}>
            {/*   ÖZEL MESAJ BİLEŞENİ (Ekranın Üst Ortasında Gösterilir) */}
            {message && (
                <div style={{
                    position: 'fixed', top: '30px', left: '50%', transform: 'translateX(-50%)', zIndex: 99999,
                    padding: '20px 30px', borderRadius: '12px', color: 'white',
                    fontWeight: '500', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    backgroundColor: message.type === 'error' ? '#ef4444' : '#10b981',
                    textAlign: 'center', minWidth: '350px', whiteSpace: 'pre-wrap', lineHeight: '1.6',
                    animation: 'fadeInDown 0.4s ease-out'
                }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                        {message.type === 'error' ? '🛑' : '✅'}
                    </div>
                    {message.text}
                </div>
            )}

            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);