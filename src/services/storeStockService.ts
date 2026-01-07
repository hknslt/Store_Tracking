// src/services/storeStockService.ts
import { db } from "../firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

// Mağazanın tüm varyant stoklarını getirir
export const getStoreStocks = async (storeId: string) => {
    try {
        const stocksRef = collection(db, "stores", storeId, "stocks");
        const snapshot = await getDocs(stocksRef);
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as { id: string; productName: string; quantity: number }[];
        
    } catch (error) {
        console.error("Stok çekme hatası:", error);
        return [];
    }
};

// Stok güncelleme (Manuel düzenleme için)
export const updateStoreStock = async (storeId: string, stockId: string, newQuantity: number) => {
    try {
        const stockRef = doc(db, "stores", storeId, "stocks", stockId);
        await updateDoc(stockRef, { quantity: newQuantity });
    } catch (error) {
        console.error("Stok güncelleme hatası:", error);
        throw error;
    }
};