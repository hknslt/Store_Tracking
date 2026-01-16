import { db } from "../firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import type { Price } from "../types";

const PRICE_COLLECTION = "prices";

// Tüm fiyatları getir
export const getAllPrices = async (): Promise<Price[]> => {
    try {
        const snapshot = await getDocs(collection(db, PRICE_COLLECTION));
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Price[];
    } catch (error) {
        console.error("Fiyat çekme hatası:", error);
        return [];
    }
};

// Fiyat Kaydet (Tekil veya Ebatlı)
export const saveProductPrice = async (productId: string, dimensionId: string | null, amount: number) => {
    try {
        const docId = dimensionId ? `${productId}_${dimensionId}` : `${productId}_std`;
        const priceRef = doc(db, PRICE_COLLECTION, docId);

        await setDoc(priceRef, {
            productId,
            dimensionId: dimensionId || null,
            amount: Number(amount)
        }, { merge: true });

    } catch (error) {
        console.error("Fiyat kaydetme hatası:", error);
        throw error;
    }
};