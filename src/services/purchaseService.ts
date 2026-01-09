// src/services/purchaseService.ts
import { db } from "../firebase";
import { collection, getDocs, orderBy, query, doc, runTransaction, where } from "firebase/firestore";
import type { Purchase, PurchaseStatus } from "../types";

// 1. YENİ ALIŞ / İADE FİŞİ KAYDETME
export const addPurchase = async (purchase: Purchase) => {
    try {
        await runTransaction(db, async (transaction) => {
            const stockUpdates: { ref: any, data: any }[] = [];

            for (const item of purchase.items) {
                const uniqueStockId = `${item.productId}_${item.colorId}_${item.dimensionId || 'null'}`;
                const stockRef = doc(db, "stores", purchase.storeId, "stocks", uniqueStockId);
                const stockDoc = await transaction.get(stockRef);

                let currentData = { freeStock: 0, reservedStock: 0, incomingStock: 0, incomingReservedStock: 0, productName: item.productName };
                if (stockDoc.exists()) {
                    currentData = stockDoc.data() as any;
                } else {
                    transaction.set(stockRef, {
                        productId: item.productId,
                        colorId: item.colorId,
                        dimensionId: item.dimensionId || null,
                        productName: item.productName,
                        freeStock: 0, reservedStock: 0, incomingStock: 0, incomingReservedStock: 0
                    });
                }

                const qty = Number(item.quantity);

                if (purchase.type === 'İade') {
                    const newFree = (currentData.freeStock || 0) + qty;
                    stockUpdates.push({ ref: stockRef, data: { freeStock: newFree } });
                } else if (purchase.type === 'Alış') {
                    const newIncoming = (currentData.incomingStock || 0) + qty;
                    stockUpdates.push({ ref: stockRef, data: { incomingStock: newIncoming } });
                }
            }

            // Fişi Kaydet (contactName alanını zaten tip tanımından opsiyonel yapmıştık, göndermezsek kaydetmez)
            const receiptRef = doc(collection(db, "purchases", purchase.storeId, "receipts"));
            transaction.set(receiptRef, purchase);

            for (const update of stockUpdates) {
                transaction.set(update.ref, update.data, { merge: true });
            }
        });
    } catch (error) {
        console.error("Alış kayıt hatası:", error);
        throw error;
    }
};

// 2. DURUM GÜNCELLEME (Örn: Sevkiyat -> Tamamlandı)
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

            // Eğer durum değişmediyse işlem yapma
            if (oldStatus === newStatus) return;

            // Stok Referansı
            const uniqueStockId = `${item.productId}_${item.colorId}_${item.dimensionId || 'null'}`;
            const stockRef = doc(db, "stores", storeId, "stocks", uniqueStockId);
            const stockDoc = await transaction.get(stockRef);

            if (!stockDoc.exists()) throw "Stok kartı bulunamadı";
            const sData = stockDoc.data();
            const qty = Number(item.quantity);

            // --- STOK TRANSFER MANTIĞI ---
            // Sadece 'Tamamlandı'ya geçişte stoklar yer değiştirir.
            // Diğer durumlar (Onaylandı, Üretim, Sevkiyat) sadece bilgi amaçlıdır, stok hala "Beklenen" havuzundadır.

            const updates: any = {};

            // 1. Eğer yeni durum 'Tamamlandı' ise: Beklenen -> Mevcut'a aktar
            if (newStatus === 'Tamamlandı' && oldStatus !== 'Tamamlandı') {
                if (purchase.type === 'Alış') {
                    // Depo için istenmişti: Incoming -> Free
                    updates.incomingStock = (sData.incomingStock || 0) - qty;
                    updates.freeStock = (sData.freeStock || 0) + qty;
                } else if (purchase.type === 'Sipariş') {
                    // Müşteri için istenmişti: IncomingReserved -> Reserved
                    updates.incomingReservedStock = (sData.incomingReservedStock || 0) - qty;
                    updates.reservedStock = (sData.reservedStock || 0) + qty;
                }
            }

            // 2. Eğer eski durum 'Tamamlandı' ise ve geri alınıyorsa (Yanlışlıkla tıklandıysa): Mevcut -> Beklenen
            else if (oldStatus === 'Tamamlandı' && newStatus !== 'Tamamlandı') {
                if (purchase.type === 'Alış') {
                    updates.freeStock = (sData.freeStock || 0) - qty;
                    updates.incomingStock = (sData.incomingStock || 0) + qty;
                } else if (purchase.type === 'Sipariş') {
                    updates.reservedStock = (sData.reservedStock || 0) - qty;
                    updates.incomingReservedStock = (sData.incomingReservedStock || 0) + qty;
                }
            }

            // Veritabanı Güncellemeleri
            if (Object.keys(updates).length > 0) {
                transaction.update(stockRef, updates);
            }

            // Fişteki satırın durumunu güncelle
            purchase.items[itemIndex].status = newStatus;
            transaction.update(purchaseRef, { items: purchase.items });
        });
    } catch (error) {
        console.error("Durum güncelleme hatası:", error);
        throw error;
    }
};

// Alışları Getir (İsteğe göre filtreli)
export const getPurchasesByStore = async (storeId: string) => {
    const q = query(collection(db, "purchases", storeId, "receipts"), orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Purchase[];
};