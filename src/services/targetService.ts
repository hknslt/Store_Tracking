// src/services/targetService.ts
import { db } from "../firebase";
import { collection, getDocs, doc, setDoc} from "firebase/firestore";
import type { StoreTarget } from "../types";

// Tüm hedefleri getir
export const getAllTargets = async () => {
    try {
        const snapshot = await getDocs(collection(db, "targets"));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as StoreTarget[];
    } catch (error) {
        console.error("Hedefleri çekme hatası:", error);
        return [];
    }
};

// Belirli bir mağazanın hedefini kaydet/güncelle
export const setStoreTarget = async (storeId: string, amount: number) => {
    try {
        const targetRef = doc(db, "targets", storeId); // Doküman ID'si = Store ID
        const data: StoreTarget = {
            storeId: storeId,
            targetAmount: amount,
            updatedAt: new Date().toISOString()
        };
        
        // merge: true kullanıyoruz ki varsa güncellesin, yoksa oluştursun
        await setDoc(targetRef, data, { merge: true });
    } catch (error) {
        console.error("Hedef kaydetme hatası:", error);
        throw error;
    }
};