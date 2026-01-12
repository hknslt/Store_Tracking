// src/services/purchaseService.ts
import { db } from "../firebase";
import { collection, getDocs, orderBy, query, doc, runTransaction, writeBatch } from "firebase/firestore";
import type { PendingRequest, Purchase, PurchaseStatus } from "../types";

// 1. YENİ ALIŞ FİŞİ KAYDETME
export const addPurchase = async (purchase: Purchase) => {
    try {
        await runTransaction(db, async (transaction) => {

            // A) OKUMALAR
            const stockReads = [];
            for (const item of purchase.items) {
                const uniqueStockId = `${item.productId}_${item.colorId}_${item.dimensionId || 'null'}`;
                const stockRef = doc(db, "stores", purchase.storeId, "stocks", uniqueStockId);
                const stockDoc = await transaction.get(stockRef);
                stockReads.push({ item, ref: stockRef, doc: stockDoc });
            }

            // B) HESAPLAMALAR
            const stockWrites: { ref: any, data: any }[] = [];

            for (const { item, ref, doc } of stockReads) {
                let currentData = { freeStock: 0, reservedStock: 0, incomingStock: 0, incomingReservedStock: 0, productName: item.productName };
                if (doc.exists()) {
                    currentData = doc.data() as any;
                }

                const updates: any = {
                    productId: item.productId,
                    colorId: item.colorId,
                    dimensionId: item.dimensionId || null,
                    productName: item.productName
                };

                const qty = Number(item.quantity);

                // Sadece Alış (Stok Girişi) Mantığı
                if (item.itemType === 'Stok') {
                    // Depo içinse: Beklenen Depo Artar
                    updates.incomingStock = (currentData.incomingStock || 0) + qty;
                }
                else if (item.itemType === 'Sipariş') {
                    // Sipariş içinse: Zaten satışta artırıldı, işlem yok.
                }

                stockWrites.push({ ref, data: updates });
            }

            // C) YAZMALAR
            const receiptRef = doc(collection(db, "purchases", purchase.storeId, "receipts"));
            transaction.set(receiptRef, purchase);

            for (const w of stockWrites) {
                transaction.set(w.ref, w.data, { merge: true });
            }
        });
    } catch (error) {
        console.error("Alış kayıt hatası:", error);
        throw error;
    }
};

// 2. DURUM GÜNCELLEME (Aynı kalacak, sadece type kontrolü kalktı çünkü hepsi Alış)
export const updatePurchaseItemStatus = async (
    storeId: string,
    purchaseId: string,
    itemIndex: number,
    newStatus: PurchaseStatus
) => {
    try {
        await runTransaction(db, async (transaction) => {
            const purchaseRef = doc(db, "purchases", storeId, "receipts", purchaseId);
            const pDoc = await transaction.get(purchaseRef);
            if (!pDoc.exists()) throw "Fiş bulunamadı";

            const purchase = pDoc.data() as Purchase;
            const item = purchase.items[itemIndex];
            const oldStatus = item.status;

            if (oldStatus === newStatus) return;

            const uniqueStockId = `${item.productId}_${item.colorId}_${item.dimensionId || 'null'}`;
            const stockRef = doc(db, "stores", storeId, "stocks", uniqueStockId);
            const stockDoc = await transaction.get(stockRef);

            if (!stockDoc.exists()) throw "Stok kartı bulunamadı.";
            const sData = stockDoc.data();
            const qty = Number(item.quantity);
            const updates: any = {};

            // --- STOK TRANSFER MANTIĞI ---

            // A) TAMAMLANDI (Depoya Giriş)
            if (newStatus === 'Tamamlandı' && oldStatus !== 'Tamamlandı') {
                if (item.itemType === 'Stok') {
                    updates.incomingStock = (sData.incomingStock || 0) - qty;
                    updates.freeStock = (sData.freeStock || 0) + qty;
                }
                else if (item.itemType === 'Sipariş') {
                    updates.incomingReservedStock = (sData.incomingReservedStock || 0) - qty;
                    updates.reservedStock = (sData.reservedStock || 0) + qty;
                }
            }

            // B) GERİ ALMA
            else if (oldStatus === 'Tamamlandı' && newStatus !== 'Tamamlandı') {
                if (item.itemType === 'Stok') {
                    updates.freeStock = (sData.freeStock || 0) - qty;
                    updates.incomingStock = (sData.incomingStock || 0) + qty;
                }
                else if (item.itemType === 'Sipariş') {
                    updates.reservedStock = (sData.reservedStock || 0) - qty;
                    updates.incomingReservedStock = (sData.incomingReservedStock || 0) + qty;
                }
            }

            if (Object.keys(updates).length > 0) {
                transaction.update(stockRef, updates);
            }

            purchase.items[itemIndex].status = newStatus;
            transaction.update(purchaseRef, { items: purchase.items });
        });
    } catch (error) {
        console.error("Durum hatası:", error);
        throw error;
    }
};

// ... (GET fonksiyonları aynı) ...
export const getPurchasesByStore = async (storeId: string) => {
    const q = query(collection(db, "purchases", storeId, "receipts"), orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Purchase[];
};

export const getPendingRequests = async (storeId: string): Promise<PendingRequest[]> => {
    const ref = collection(db, "stores", storeId, "pending_requests");
    const snap = await getDocs(ref);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PendingRequest[];
};

export const deletePendingRequests = async (storeId: string, requestIds: string[]) => {
    const batch = writeBatch(db);
    requestIds.forEach(id => {
        const ref = doc(db, "stores", storeId, "pending_requests", id);
        batch.delete(ref);
    });
    await batch.commit();
};