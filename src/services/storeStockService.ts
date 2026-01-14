// src/services/storeStockService.ts
import { db } from "../firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import type { StoreStock } from "../types";

// Mağazanın tüm varyant stoklarını getirir
export const getStoreStocks = async (storeId: string) => {
    try {
        const stocksRef = collection(db, "stores", storeId, "stocks");
        const snapshot = await getDocs(stocksRef);

        const rawData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as StoreStock[];

        // 🔥 FİLTRELEME: Hepsi 0 ise listeye dahil etme
        return rawData.filter(stock =>
            (stock.freeStock || 0) !== 0 ||
            (stock.reservedStock || 0) !== 0 ||
            (stock.incomingStock || 0) !== 0 ||
            (stock.incomingReservedStock || 0) !== 0
        );

    } catch (error) {
        console.error("Stok çekme hatası:", error);
        return [];
    }
};

export const updateStoreStock = async (storeId: string, stockId: string, updates: Partial<StoreStock>) => {
    try {
        const stockRef = doc(db, "stores", storeId, "stocks", stockId);
        await updateDoc(stockRef, updates);

        // Eğer güncelleme sonrası her şey 0 olduysa silinebilir (İsteğe bağlı)
        // checkAndCleanupStock(storeId, stockId); 
    } catch (error) {
        console.error("Stok güncelleme hatası:", error);
        throw error;
    }
};

// 🔥 YARDIMCI FONKSİYON: Stok 0 ise veritabanından sil (Temizlik İçin)
// Bunu alış/satış servislerinin sonunda çağırabilirsiniz.
export const checkAndCleanupStock = async (storeId: string, stockId: string) => {
    const stockRef = doc(db, "stores", storeId, "stocks", stockId);
    const snap = await getDoc(stockRef);
    if (snap.exists()) {
        const data = snap.data() as StoreStock;
        if (
            (data.freeStock || 0) === 0 &&
            (data.reservedStock || 0) === 0 &&
            (data.incomingStock || 0) === 0 &&
            (data.incomingReservedStock || 0) === 0
        ) {
            await deleteDoc(stockRef); // Veritabanından sil
        }
    }
};