// src/services/storeStockService.ts
import { db } from "../firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import type { StoreStock } from "../types";

// Mağazanın tüm varyant stoklarını getirir
export const getStoreStocks = async (storeId: string) => {
    try {
        const stocksRef = collection(db, "stores", storeId, "stocks");
        const snapshot = await getDocs(stocksRef);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as StoreStock[];

    } catch (error) {
        console.error("Stok çekme hatası:", error);
        return [];
    }
};

// Manuel Stok Güncelleme (Sadece Admin yetkisiyle yapılmalı, tehlikeli olabilir)
// Genelde bu işlem Alış/Satış servisleri üzerinden otomatik yapılmalı.
export const updateStoreStock = async (storeId: string, stockId: string, updates: Partial<StoreStock>) => {
    try {
        const stockRef = doc(db, "stores", storeId, "stocks", stockId);
        await updateDoc(stockRef, updates);
    } catch (error) {
        console.error("Stok güncelleme hatası:", error);
        throw error;
    }
};