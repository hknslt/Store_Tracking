// src/services/stockService.ts
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
import type { StoreStock } from "../types";

const STOCK_COLLECTION = "stocks";

// Tüm stokları getir
export const getAllStocks = async (): Promise<StoreStock[]> => {
    try {
        const snapshot = await getDocs(collection(db, STOCK_COLLECTION));
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as StoreStock[];
    } catch (error) {
        console.error("Stoklar çekilirken hata:", error);
        return [];
    }
};

// Stok Kaydet veya Güncelle (Upsert)
export const saveProductStock = async (productId: string, quantity: number) => {
    try {
        // 1. Bu ürünün stoku var mı kontrol et
        const q = query(
            collection(db, STOCK_COLLECTION), 
            where("productId", "==", productId)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            // VARSA: Güncelle
            const stockDocId = snapshot.docs[0].id;
            const stockRef = doc(db, STOCK_COLLECTION, stockDocId);
            await updateDoc(stockRef, { quantity });
        } else {
            // YOKSA: Yeni Ekle
            await addDoc(collection(db, STOCK_COLLECTION), {
                productId,
                quantity
            });
        }
    } catch (error) {
        console.error("Stok işlemi hatası:", error);
        throw error;
    }
};