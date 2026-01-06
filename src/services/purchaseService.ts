// src/services/purchaseService.ts
import { db } from "../firebase";
import { collection, addDoc, getDocs, orderBy, query } from "firebase/firestore";
import type { Purchase } from "../types";

const PURCHASE_COLLECTION = "purchases";

// Alış Kaydet
export const addPurchase = async (purchase: Purchase) => {
    try {
        await addDoc(collection(db, PURCHASE_COLLECTION), purchase);
    } catch (error) {
        console.error("Alış eklenirken hata:", error);
        throw error;
    }
};

// Alışları Listele (Tarihe göre yeniden eskiye)
export const getPurchases = async (): Promise<Purchase[]> => {
    try {
        const q = query(collection(db, PURCHASE_COLLECTION), orderBy("date", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Purchase[];
    } catch (error) {
        console.error("Alışlar çekilirken hata:", error);
        return [];
    }
};