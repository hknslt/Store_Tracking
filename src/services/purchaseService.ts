// src/services/purchaseService.ts
import { db } from "../firebase";
import { collection, getDocs, orderBy, query, doc, runTransaction, writeBatch, limit } from "firebase/firestore";
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

                // --- STOK GİRİŞ MANTIĞI (DÜZELTİLDİ) ---

                if (item.itemType === 'Stok') {
                    // Depo için normal giriş: Beklenen Depo Artar
                    updates.incomingStock = (currentData.incomingStock || 0) + qty;
                }
                else if (item.itemType === 'Sipariş') {
                    // 🔥 KRİTİK DÜZELTME:
                    // Eğer bu ürün "Bekleyen Taleplerden" (Pending Request) geldiyse (requestId varsa),
                    // Satış anında zaten 'incomingReservedStock' artırılmıştı.
                    // O yüzden burada TEKRAR ARTIRMA! (Çift kayıt olmasın)

                    // Ancak, eğer manuel olarak "Sipariş" tipinde ürün eklediysek (requestId yoksa),
                    // O zaman artırmamız gerekir.

                    if (!(item as any).requestId) {
                        updates.incomingReservedStock = (currentData.incomingReservedStock || 0) + qty;
                    }
                    // else: requestId varsa stok zaten artmıştır, dokunma.
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

// 2. DURUM GÜNCELLEME
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

            // A) TAMAMLANDI (Depoya/Müşteriye Giriş)
            if (newStatus === 'Tamamlandı' && oldStatus !== 'Tamamlandı') {
                if (item.itemType === 'Stok') {
                    // Depo stoğu: Gelecekten düş -> Serbest Stoğa ekle
                    updates.incomingStock = Math.max(0, (sData.incomingStock || 0) - qty);
                    updates.freeStock = (sData.freeStock || 0) + qty;
                }
                else if (item.itemType === 'Sipariş') {
                    // Müşteri Siparişi: Gelecek Rezerve'den düş -> Rezerve Stoğa ekle
                    updates.incomingReservedStock = Math.max(0, (sData.incomingReservedStock || 0) - qty);
                    updates.reservedStock = (sData.reservedStock || 0) + qty;
                }
            }

            // B) GERİ ALMA (Tamamlandı'dan geri alma)
            else if (oldStatus === 'Tamamlandı' && newStatus !== 'Tamamlandı') {
                if (item.itemType === 'Stok') {
                    updates.freeStock = Math.max(0, (sData.freeStock || 0) - qty);
                    updates.incomingStock = (sData.incomingStock || 0) + qty;
                }
                else if (item.itemType === 'Sipariş') {
                    updates.reservedStock = Math.max(0, (sData.reservedStock || 0) - qty);
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

// 3. GET FONKSİYONLARI
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

export const getNextPurchaseReceiptNo = async (storeId: string): Promise<string> => {
    try {
        const receiptsRef = collection(db, "purchases", storeId, "receipts");
        const q = query(
            receiptsRef,
            orderBy("createdAt", "desc"),
            limit(50)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return "1";
        }

        let maxNumber = 0;

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const receiptNo = Number(data.receiptNo);
            if (!isNaN(receiptNo) && receiptNo > maxNumber) {
                maxNumber = receiptNo;
            }
        });

        return (maxNumber + 1).toString();

    } catch (error) {
        console.error("Fiş no getirme hatası:", error);
        return Date.now().toString().slice(-6);
    }
};

// 🔥 4. ALIŞ İPTAL ETME (Stokları Düzeltir)
export const cancelPurchaseComplete = async (storeId: string, purchaseId: string) => {
    try {
        await runTransaction(db, async (transaction) => {
            const purchaseRef = doc(db, "purchases", storeId, "receipts", purchaseId);
            const purchaseDoc = await transaction.get(purchaseRef);
            if (!purchaseDoc.exists()) throw "Kayıt bulunamadı.";

            const purchase = purchaseDoc.data() as Purchase;

            // Stokları Geri Al
            for (const item of purchase.items) {
                if (item.status === 'İptal') continue;

                const uniqueStockId = `${item.productId}_${item.colorId}_${item.dimensionId || 'null'}`;
                const stockRef = doc(db, "stores", storeId, "stocks", uniqueStockId);
                const stockDoc = await transaction.get(stockRef);

                if (stockDoc.exists()) {
                    const currentData = stockDoc.data();
                    const qty = Number(item.quantity);
                    const updates: any = {};

                    // 1. Durum: Ürün 'Stok' tipindeyse (Depo girişi)
                    if (item.itemType === 'Stok') {
                        if (item.status === 'Tamamlandı') {
                            updates.freeStock = Math.max(0, (currentData.freeStock || 0) - qty);
                        } else {
                            updates.incomingStock = Math.max(0, (currentData.incomingStock || 0) - qty);
                        }
                    }

                    // 2. Durum: Ürün 'Sipariş' tipindeyse (Müşteri için)
                    else if (item.itemType === 'Sipariş') {
                        // 🔥 ÖNEMLİ: Eğer bu ürün satıştan geldiyse (requestId varsa),
                        // Alış kaydı sırasında stok artırmamıştık.
                        // O yüzden iptal ederken de stok DÜŞMEMELİYİZ.

                        // Sadece manuel eklenen (requestId olmayan) siparişler için stok düşülmeli.
                        if (!(item as any).requestId) {
                            if (item.status === 'Tamamlandı') {
                                updates.reservedStock = Math.max(0, (currentData.reservedStock || 0) - qty);
                            } else {
                                updates.incomingReservedStock = Math.max(0, (currentData.incomingReservedStock || 0) - qty);
                            }
                        } else {
                            // Eğer requestId varsa, bu ürün satıştan gelmiştir.
                            // Satış iptal edilmediği sürece bu stok "Gelecek Müşteri" olarak kalmalıdır.
                            // ANCAK: Alış iptal olduğu için "Tedarik Süreci" durmuş olur.
                            // Bu durumda stok ne olacak?
                            // Mantıken satış hala "Merkezden" bekliyor durumunda.
                            // Yani incomingReservedStock kalmalı mı? Evet.
                            // Çünkü satış kaydı hala o ürünün geleceğini söylüyor.
                            // Sadece bu alış fişi iptal oldu, belki başka bir alış fişiyle gelecek.
                            // O yüzden requestId varsa STOK DÜŞME!
                        }
                    }

                    if (Object.keys(updates).length > 0) {
                        transaction.update(stockRef, updates);
                    }
                }
            }

            const updatedItems = purchase.items.map(i => ({ ...i, status: 'İptal' as any }));
            transaction.update(purchaseRef, { items: updatedItems, totalAmount: 0 });
        });
    } catch (error) {
        console.error("İptal hatası:", error);
        throw error;
    }
};


// 🔥 5. ALIŞ SİLME (Güvenli Mod)
export const deletePurchaseComplete = async (storeId: string, purchaseId: string) => {
    try {
        await runTransaction(db, async (transaction) => {
            const purchaseRef = doc(db, "purchases", storeId, "receipts", purchaseId);
            const purchaseDoc = await transaction.get(purchaseRef);
            if (!purchaseDoc.exists()) throw "Kayıt bulunamadı.";

            const purchase = purchaseDoc.data() as Purchase;

            // KONTROL GÜNCELLENDİ: 
            // Fişteki tüm ürünler 'İptal' EDİLMİŞ Mİ VEYA 'Tamamlandı' MI?
            // (Yani aktif süreçte -Beklemede, Üretim, Sevkiyat- olan bir şey silinmesin)

            const isSafeToDelete = purchase.items.every(i =>
                i.status === 'İptal' || i.status === 'Tamamlandı'
            );

            if (!isSafeToDelete) {
                // Eğer hala aktif süreçte (Beklemede, Onaylandı vs.) olan varsa uyarı ver
                throw new Error("Aktif süreçteki sipariş silinemez! Önce süreci tamamlayın veya iptal edin.");
            }

            // Güvenli ise sil
            transaction.delete(purchaseRef);
        });
    } catch (error) {
        console.error("Silme hatası:", error);
        throw error;
    }
};