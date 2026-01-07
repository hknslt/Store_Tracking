// src/services/purchaseService.ts
import { db } from "../firebase";
import { collection, getDocs, orderBy, query, doc, runTransaction } from "firebase/firestore";
import type { Purchase } from "../types";

// Alış Fişini Kaydet ve Stokları Güncelle (Minderden Bağımsız Stok)
export const addPurchase = async (purchase: Purchase) => {
    try {
        await runTransaction(db, async (transaction) => {

            // --- 1. AŞAMA: OKUMA ---
            const stockUpdates = [];

            for (const item of purchase.items) {
                // STOK ID OLUŞTURMA MANTIĞI:
                // Sadece ÜrünID, RenkID ve EbatID'ye göre stok tutuyoruz.
                // Minder bilgisi stokta ayırıcı değildir.

                // Benzersiz Stok ID'si: "ÜrünID_RenkID_EbatID"
                // Eğer ebat yoksa "ÜrünID_RenkID_null" gibi olacak.
                const uniqueStockId = `${item.productId}_${item.colorId}_${item.dimensionId || 'null'}`;

                const stockRef = doc(db, "stores", purchase.storeId, "stocks", uniqueStockId);

                const stockDoc = await transaction.get(stockRef);

                let currentStock = 0;
                if (stockDoc.exists()) {
                    currentStock = stockDoc.data().quantity || 0;
                }

                const newStock = currentStock + Number(item.quantity);

                // Stok güncelleme listesine ekle
                stockUpdates.push({
                    ref: stockRef,
                    data: {
                        productId: item.productId,
                        colorId: item.colorId,
                        dimensionId: item.dimensionId || null,
                        quantity: newStock,
                        // Ürün adını da stokta tutalım ki listede kolay görelim
                        productName: item.productName // (İsim+Ebat+Renk birleşik hali)
                    }
                });
            }

            // --- 2. AŞAMA: YAZMA ---

            // A) Fişi Kaydet (Minder bilgisi burada saklanıyor)
            const receiptRef = doc(collection(db, "purchases", purchase.storeId, "receipts"));
            transaction.set(receiptRef, purchase);

            // B) Stokları Güncelle (Minderden bağımsız)
            for (const update of stockUpdates) {
                // set(..., {merge: true}) kullanıyoruz ki varsa güncellensin, yoksa oluşsun
                transaction.set(update.ref, update.data, { merge: true });
            }
        });
    } catch (error) {
        console.error("Alış işlemi hatası:", error);
        throw error;
    }
};

// ... (getPurchasesByStore aynı kalacak)
export const getPurchasesByStore = async (storeId: string): Promise<Purchase[]> => {
    try {
        const q = query(
            collection(db, "purchases", storeId, "receipts"),
            orderBy("date", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Purchase[];
    } catch (error) {
        console.error("Hata:", error);
        return [];
    }
};