// src/services/purchaseService.ts
import { db } from "../firebase";
import { collection, addDoc, getDocs, orderBy, query, doc, runTransaction } from "firebase/firestore";
import type { Purchase } from "../types";

// YOL: purchases/{storeId}/receipts/{receiptId}

// Alış Fişini Kaydet ve Stokları Güncelle
export const addPurchase = async (purchase: Purchase) => {
    try {
        await runTransaction(db, async (transaction) => {

            // --- 1. AŞAMA: TÜM OKUMALAR (READS) ---
            // Önce işlem yapılacak tüm stokları okumamız lazım.
            // Henüz hiçbir şey yazmıyoruz!

            const stockUpdates = []; // Güncellenecek stokları burada tutacağız

            for (const item of purchase.items) {
                const stockRef = doc(db, "stores", purchase.storeId, "products", item.productId);

                // Transaction içindeki okuma işlemi:
                const stockDoc = await transaction.get(stockRef);

                let currentStock = 0;
                if (stockDoc.exists()) {
                    currentStock = stockDoc.data().stock || 0;
                }

                // Yeni stoğu hesapla ve listeye ekle (Henüz veritabanına yazma!)
                const newStock = currentStock + Number(item.quantity);

                stockUpdates.push({
                    ref: stockRef,
                    amount: newStock
                });
            }

            // --- 2. AŞAMA: TÜM YAZMALAR (WRITES) ---
            // Artık okuma bitti, yazma işlemlerine başlayabiliriz.

            // A) Fişi Kaydet
            const receiptRef = doc(collection(db, "purchases", purchase.storeId, "receipts"));
            transaction.set(receiptRef, purchase);

            // B) Stokları Güncelle (Hazırladığımız listeden)
            for (const update of stockUpdates) {
                transaction.set(update.ref, { stock: update.amount }, { merge: true });
            }
        });
    } catch (error) {
        console.error("Alış işlemi hatası:", error);
        throw error;
    }
};

// Belirli bir Mağazanın Alışlarını Getir
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
        console.error("Alışlar çekilirken hata:", error);
        return [];
    }
};