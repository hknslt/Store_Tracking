// src/services/priceService.ts
import { db } from "../firebase";
import { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    updateDoc, 
    doc 
} from "firebase/firestore";
import type { Price } from "../types";

const PRICE_COLLECTION = "prices";

// Tüm fiyatları getir
export const getAllPrices = async (): Promise<Price[]> => {
    const snapshot = await getDocs(collection(db, PRICE_COLLECTION));
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as Price[];
};

// Fiyat Kaydet veya Güncelle (Upsert Mantığı)
export const saveProductPrice = async (productId: string, amount: number) => {
    try {
        // 1. Önce bu ürünün fiyatı var mı diye kontrol et
        const q = query(
            collection(db, PRICE_COLLECTION), 
            where("productId", "==", productId)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            // VARSA: Güncelle
            const priceDocId = snapshot.docs[0].id;
            const priceRef = doc(db, PRICE_COLLECTION, priceDocId);
            await updateDoc(priceRef, { amount });
        } else {
            // YOKSA: Yeni Ekle
            await addDoc(collection(db, PRICE_COLLECTION), {
                productId,
                amount
            });
        }
    } catch (error) {
        console.error("Fiyat işlemi hatası:", error);
        throw error;
    }
};