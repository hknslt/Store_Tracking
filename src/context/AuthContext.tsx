import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import type { SystemUser } from "../types";

interface AuthContextType {
    currentUser: User | null;
    userData: SystemUser | null; // 👇 Firestore'dan gelen detaylı veri (rol burada)
    userRole: string | null;     // 👇 Kolay erişim için rol
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<SystemUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);

            if (user) {
                // Kullanıcı giriş yaptıysa Firestore'dan rolünü çek
                try {
                    const userDoc = await getDoc(doc(db, "personnel", user.uid));
                    if (userDoc.exists()) {
                        setUserData(userDoc.data() as SystemUser);
                    }
                } catch (error) {
                    console.error("Kullanıcı verisi çekilemedi:", error);
                }
            } else {
                setUserData(null);
            }

            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const values = {
        currentUser,
        userData,
        userRole: userData?.role || null, // Rolü kısayol olarak sunuyoruz
        loading
    };

    return (
        <AuthContext.Provider value={values}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);