// src/services/purchaseService.ts
import { db } from "../firebase";
import { collection, getDocs, orderBy, query, doc, runTransaction, writeBatch, limit, where } from "firebase/firestore";
import type { PendingRequest, Purchase, PurchaseItem, PurchaseStatus } from "../types";

// 1. YENİ ALIŞ FİŞİ KAYDETME
export const addPurchase = async (purchase: Purchase) => {
    try {


        const checkQuery = query(
            collection(db, "purchases", purchase.storeId, "receipts"),
            where("receiptNo", "==", purchase.receiptNo)
        );
        const checkSnap = await getDocs(checkQuery);

        if (!checkSnap.empty) {
            throw new Error(`Bu fiş numarası (${purchase.receiptNo}) zaten kullanılmış! Lütfen farklı bir numara girin.`);
        }
        await runTransaction(db, async (transaction) => {

            // A) OKUMALAR
            const stockDeltas: Record<string, any> = {};
            for (const item of purchase.items) {
                //   DİKKAT: cushionId çıkarıldı. Sadece Ürün + Renk + Ebat
                const uniqueStockId = `${item.productId}_${item.colorId}_${item.dimensionId || 'null'}`;

                if (!stockDeltas[uniqueStockId]) {
                    stockDeltas[uniqueStockId] = {
                        productId: item.productId,
                        colorId: item.colorId,
                        dimensionId: item.dimensionId || null,
                        productName: item.productName,
                        incomingStock: 0,
                        incomingReservedStock: 0
                    };
                }

                const qty = Number(item.quantity);

                if (item.itemType === 'Stok') {
                    stockDeltas[uniqueStockId].incomingStock += qty;
                } else if (item.itemType === 'Sipariş') {
                    if (!(item as any).requestId) {
                        stockDeltas[uniqueStockId].incomingReservedStock += qty;
                    }
                }
            }

            // B) HESAPLAMALAR
            const stockWrites: { ref: any, data: any }[] = [];

            for (const uniqueStockId of Object.keys(stockDeltas)) {
                const delta = stockDeltas[uniqueStockId];
                const stockRef = doc(db, "stores", purchase.storeId, "stocks", uniqueStockId);
                const stockDoc = await transaction.get(stockRef);

                let currentData = { incomingStock: 0, incomingReservedStock: 0 };
                if (stockDoc.exists()) currentData = stockDoc.data() as any;

                const updates = {
                    productId: delta.productId,
                    colorId: delta.colorId,
                    dimensionId: delta.dimensionId,
                    productName: delta.productName,
                    incomingStock: (currentData.incomingStock || 0) + delta.incomingStock,
                    incomingReservedStock: (currentData.incomingReservedStock || 0) + delta.incomingReservedStock
                };

                stockWrites.push({ ref: stockRef, data: updates });
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

//   4. ALIŞ İPTAL ETME (Stokları Düzeltir)
export const cancelPurchaseComplete = async (storeId: string, purchaseId: string) => {
    try {
        await runTransaction(db, async (transaction) => {
            const purchaseRef = doc(db, "purchases", storeId, "receipts", purchaseId);
            const purchaseDoc = await transaction.get(purchaseRef);
            if (!purchaseDoc.exists()) throw "Kayıt bulunamadı.";

            const purchase = purchaseDoc.data() as Purchase;

            // Stokları Geri Al
            const stockDeltas: Record<string, any> = {};

            for (const item of purchase.items) {
                if (item.status === 'İptal') continue;

                // Minder yok
                const uniqueStockId = `${item.productId}_${item.colorId}_${item.dimensionId || 'null'}`;
                if (!stockDeltas[uniqueStockId]) {
                    stockDeltas[uniqueStockId] = { freeStock: 0, incomingStock: 0, reservedStock: 0, incomingReservedStock: 0 };
                }

                const qty = Number(item.quantity);
                if (item.itemType === 'Stok') {
                    if (item.status === 'Tamamlandı') stockDeltas[uniqueStockId].freeStock += qty;
                    else stockDeltas[uniqueStockId].incomingStock += qty;
                } else if (item.itemType === 'Sipariş') {
                    if (!(item as any).requestId) {
                        if (item.status === 'Tamamlandı') stockDeltas[uniqueStockId].reservedStock += qty;
                        else stockDeltas[uniqueStockId].incomingReservedStock += qty;
                    }
                }
            }

            for (const uniqueStockId of Object.keys(stockDeltas)) {
                const delta = stockDeltas[uniqueStockId];
                const stockRef = doc(db, "stores", storeId, "stocks", uniqueStockId);
                const stockDoc = await transaction.get(stockRef);

                if (stockDoc.exists()) {
                    const currentData = stockDoc.data();
                    const updates: any = {};

                    if (delta.freeStock > 0) updates.freeStock = Math.max(0, (currentData.freeStock || 0) - delta.freeStock);
                    if (delta.incomingStock > 0) updates.incomingStock = Math.max(0, (currentData.incomingStock || 0) - delta.incomingStock);
                    if (delta.reservedStock > 0) updates.reservedStock = Math.max(0, (currentData.reservedStock || 0) - delta.reservedStock);
                    if (delta.incomingReservedStock > 0) updates.incomingReservedStock = Math.max(0, (currentData.incomingReservedStock || 0) - delta.incomingReservedStock);

                    if (Object.keys(updates).length > 0) transaction.update(stockRef, updates);
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


//   5. ALIŞ SİLME (Güvenli Mod)
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
export const updatePurchase = async (
    storeId: string,
    purchaseId: string,
    updatedFields: Partial<Purchase>, // Başlık bilgileri
    addedItems: PurchaseItem[],       // Yeni eklenenler
    removedItems: PurchaseItem[]      // Silinenler
) => {
    try {
        await runTransaction(db, async (transaction) => {
            // 1. Mevcut Fişi Getir
            const purchaseRef = doc(db, "purchases", storeId, "receipts", purchaseId);
            const purchaseDoc = await transaction.get(purchaseRef);
            if (!purchaseDoc.exists()) throw "Fiş bulunamadı.";

            const currentPurchase = purchaseDoc.data() as Purchase;

            // --- A) SİLİNEN ÜRÜNLERİN STOKTAN GERİ ALINMASI ---
            for (const item of removedItems) {
                // İptal edilmişse işlem yapma
                if (item.status === 'İptal') continue;

                const uniqueStockId = `${item.productId}_${item.colorId}_${item.dimensionId || 'null'}`;
                const stockRef = doc(db, "stores", storeId, "stocks", uniqueStockId);
                const stockDoc = await transaction.get(stockRef);

                if (stockDoc.exists()) {
                    const sData = stockDoc.data();
                    const qty = Number(item.quantity);
                    const updates: any = {};

                    // Eğer ürün 'Stok' tipindeyse (Depo girişi)
                    if (item.itemType === 'Stok') {
                        if (item.status === 'Tamamlandı') {
                            // Depoya girmişse, serbest stoktan düş
                            updates.freeStock = Math.max(0, (sData.freeStock || 0) - qty);
                        } else {
                            // Henüz yoldaysa, gelecek stoktan düş
                            updates.incomingStock = Math.max(0, (sData.incomingStock || 0) - qty);
                        }
                    }
                    // Eğer 'Sipariş' tipindeyse (Müşteri için)
                    else if (item.itemType === 'Sipariş') {
                        // Manuel eklenen bir sipariş ise stoktan düş (RequestId yoksa)
                        // (RequestId varsa satıştan gelmiştir, onu satış iptal etmeden düşmemek daha güvenli, 
                        //  ama burada düzenleme yapıldığı için kullanıcının isteği üzerine düşüyoruz)
                        if (item.status === 'Tamamlandı') {
                            updates.reservedStock = Math.max(0, (sData.reservedStock || 0) - qty);
                        } else {
                            updates.incomingReservedStock = Math.max(0, (sData.incomingReservedStock || 0) - qty);
                        }
                    }

                    if (Object.keys(updates).length > 0) {
                        transaction.update(stockRef, updates);
                    }
                }
            }

            // --- B) YENİ EKLENEN ÜRÜNLERİN STOK GİRİŞİ ---
            for (const item of addedItems) {
                const uniqueStockId = `${item.productId}_${item.colorId}_${item.dimensionId || 'null'}`;
                const stockRef = doc(db, "stores", storeId, "stocks", uniqueStockId);
                const stockDoc = await transaction.get(stockRef);

                let currentData = { freeStock: 0, reservedStock: 0, incomingStock: 0, incomingReservedStock: 0, productName: item.productName };
                if (stockDoc.exists()) currentData = stockDoc.data() as any;

                const qty = Number(item.quantity);
                const updates: any = {};

                // Yeni eklenen ürünler varsayılan olarak "Beklemede" statüsüyle gelir.
                // Bu yüzden "Incoming" (Gelecek) stoklarını artırıyoruz.

                if (item.itemType === 'Stok') {
                    updates.incomingStock = (currentData.incomingStock || 0) + qty;
                } else if (item.itemType === 'Sipariş') {
                    updates.incomingReservedStock = (currentData.incomingReservedStock || 0) + qty;
                }

                if (stockDoc.exists()) {
                    transaction.update(stockRef, updates);
                } else {
                    transaction.set(stockRef, { ...updates, productId: item.productId, productName: item.productName });
                }
            }

            // --- C) FİŞİ GÜNCELLE ---
            // Listeyi birleştir: (Eskiler - Silinenler) + Yeniler
            const finalItems = [
                ...currentPurchase.items.filter(oldItem =>
                    !removedItems.some(rem =>
                        rem.productId === oldItem.productId &&
                        rem.colorId === oldItem.colorId &&
                        rem.dimensionId === oldItem.dimensionId &&
                        rem.cushionId === oldItem.cushionId &&
                        rem.amount === oldItem.amount // Fiyatı aynı olanı sil (basit eşleşme)
                    )
                ),
                ...addedItems
            ];

            const newTotalAmount = finalItems.reduce((acc, i) => acc + Number(i.amount), 0);

            transaction.update(purchaseRef, {
                ...updatedFields,
                items: finalItems,
                totalAmount: newTotalAmount
            });
        });
    } catch (error) {
        console.error("Güncelleme hatası:", error);
        throw error;
    }
};

export const resetPurchaseToPending = async (storeId: string, purchaseId: string) => {
    try {
        await runTransaction(db, async (transaction) => {
            const purchaseRef = doc(db, "purchases", storeId, "receipts", purchaseId);
            const pDoc = await transaction.get(purchaseRef);
            if (!pDoc.exists()) throw "Fiş bulunamadı";

            const purchase = pDoc.data() as Purchase;
            const updatedItems = purchase.items.map(item => {
                // İptal veya Tamamlandı olanlara dokunma, diğerlerini Beklemeye çek
                if (item.status !== 'İptal' && item.status !== 'Tamamlandı') {
                    return { ...item, status: 'Beklemede' as PurchaseStatus };
                }
                return item;
            });

            // Stok hareketi gerekmez çünkü Beklemede/Onaylandı/Üretim/Sevkiyat 
            // aşamalarında stok zaten "Gelecek Stok" hanesinde duruyor. 
            // Sadece etiket değişiyor.

            transaction.update(purchaseRef, { items: updatedItems });
        });
    } catch (error) {
        console.error("Sıfırlama hatası:", error);
        throw error;
    }
};