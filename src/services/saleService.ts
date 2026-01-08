// src/services/saleService.ts
import { db } from "../firebase";
import { collection, getDocs, orderBy, query, doc, runTransaction ,   } from "firebase/firestore";
import type { Sale, Purchase, PurchaseItem } from "../types";

export const addSale = async (sale: Sale) => {
    try {
        await runTransaction(db, async (transaction) => {

            // --- 1. AŞAMA: TÜM OKUMALAR (READS) ---
            // Döngü içinde yazma yapmamak için önce tüm stok verilerini okuyup hafızaya alıyoruz.

            const stockReads = []; // Okunan verileri burada tutacağız

            for (const item of sale.items) {
                if (item.status === 'İptal' || item.status === 'İade') continue;

                const uniqueStockId = `${item.productId}_${item.colorId}_${item.dimensionId || 'null'}`;
                const stockRef = doc(db, "stores", sale.storeId, "stocks", uniqueStockId);

                // Transaction içindeki okuma
                const stockDoc = await transaction.get(stockRef);

                stockReads.push({
                    item: item,
                    ref: stockRef,
                    doc: stockDoc
                });
            }

            // --- 2. AŞAMA: HESAPLAMALAR VE YAZMA HAZIRLIĞI ---
            // Artık okuma yapmayacağız, elimizdeki verilerle ne yazacağımızı hesaplıyoruz.

            const stockWrites: { ref: any, data: any }[] = [];
            const orderItemsForPurchase: PurchaseItem[] = [];

            for (const { item, ref, doc } of stockReads) {

                // Stok kartı var mı kontrolü, yoksa varsayılan değerler
                let currentData = {
                    freeStock: 0,
                    reservedStock: 0,
                    incomingReservedStock: 0,
                    productName: item.productName
                };

                if (doc.exists()) {
                    currentData = doc.data() as any;
                }
                // Not: Doc yoksa bile 'currentData'yı 0 kabul ettik, yazma aşamasında 'merge: true' ile oluşturacağız.

                const qty = Number(item.quantity);
                const updates: any = {
                    productId: item.productId,
                    colorId: item.colorId,
                    dimensionId: item.dimensionId || null,
                    productName: item.productName
                };

                if (item.supplyMethod === 'Stoktan') {
                    // SENARYO A: Stoktan Karşıla
                    const newFree = (currentData.freeStock || 0) - qty;
                    const newReserved = (currentData.reservedStock || 0) + qty;

                    updates.freeStock = newFree;
                    updates.reservedStock = newReserved;

                } else if (item.supplyMethod === 'Merkezden') {
                    // SENARYO B: Merkezden İste
                    const newIncomingReserved = (currentData.incomingReservedStock || 0) + qty;

                    updates.incomingReservedStock = newIncomingReserved;

                    // Otomatik Alış Fişi Listesine Ekle
                    orderItemsForPurchase.push({
                        groupId: item.groupId,
                        categoryId: item.categoryId,
                        productId: item.productId,
                        productName: item.productName,
                        colorId: item.colorId,
                        cushionId: item.cushionId || "",
                        dimensionId: item.dimensionId,
                        quantity: qty,
                        amount: 0,
                        explanation: `Satış Siparişi: ${sale.receiptNo} - ${sale.customerName}`,
                        status: 'Beklemede'
                    });
                }

                // Hazırlanan güncellemeyi listeye ekle
                stockWrites.push({ ref: ref, data: updates });
            }

            // --- 3. AŞAMA: TÜM YAZMALAR (WRITES) ---
            // Artık güvenle tüm yazma işlemlerini art arda yapabiliriz.

            // A) Satış Fişini Kaydet
            const saleRef = doc(collection(db, "sales", sale.storeId, "receipts"));
            transaction.set(saleRef, sale);

            // B) Stokları Güncelle
            for (const w of stockWrites) {
                // merge: true sayesinde belge yoksa oluşturur, varsa sadece ilgili alanları günceller
                transaction.set(w.ref, w.data, { merge: true });
            }

            // C) Otomatik Sipariş (Alış) Fişi Oluştur (Varsa)
            if (orderItemsForPurchase.length > 0) {
                const purchaseRef = doc(collection(db, "purchases", sale.storeId, "receipts"));
                const newPurchase: Purchase = {
                    storeId: sale.storeId,
                    type: 'Sipariş',
                    date: sale.date,
                    receiptNo: `OTO-${sale.receiptNo}`,
                    personnelId: sale.personnelId,
                    personnelName: "Sistem (Otomatik)",
                    items: orderItemsForPurchase,
                    totalAmount: 0,
                    createdAt: new Date()
                };
                transaction.set(purchaseRef, newPurchase);
            }
        });
    } catch (error) {
        console.error("Satış kaydı hatası:", error);
        throw error;
    }
};

export const getSalesByStore = async (storeId: string): Promise<Sale[]> => {
    try {
        const q = query(collection(db, "sales", storeId, "receipts"), orderBy("date", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Sale[];
    } catch (error) {
        console.error(error);
        return [];
    }
};


export const updateSaleItemStatus = async (
    storeId: string, 
    saleId: string, 
    itemIndex: number, 
    newDeliveryStatus: 'Bekliyor' | 'Teslim Edildi'
) => {
    try {
        const saleRef = doc(db, "sales", storeId, "receipts", saleId);
        
        // Transaction ile yapmak daha güvenli ama basitlik için direct update yapalım
        // (Çünkü burada stok hareketi yok, sadece durum değişiyor)
        await runTransaction(db, async (transaction) => {
            const saleDoc = await transaction.get(saleRef);
            if (!saleDoc.exists()) throw "Satış bulunamadı";
            
            const sale = saleDoc.data() as Sale;
            
            // Durumu güncelle
            sale.items[itemIndex].deliveryStatus = newDeliveryStatus;
            
            // Eğer hepsi teslim edildiyse, genel satışı da 'Tamamlandı' yapabiliriz (Opsiyonel)
            // if (sale.items.every(i => i.deliveryStatus === 'Teslim Edildi')) { sale.status = 'Tamamlandı'; }

            transaction.update(saleRef, { items: sale.items });
        });
    } catch (error) {
        console.error("Durum güncelleme hatası:", error);
        throw error;
    }
};