// src/services/saleService.ts
import { db } from "../firebase";
import { collection, getDocs, orderBy, query, doc, runTransaction, } from "firebase/firestore";
import type { Sale, Purchase, PurchaseItem, DeliveryStatus } from "../types";

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
                        explanation: `Müşteri Adı: ${sale.customerName}`,
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
                    receiptNo: `SAT-${sale.receiptNo}`,
                    personnelId: sale.personnelId,
                    personnelName: "Sistem",
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
    newDeliveryStatus: DeliveryStatus
) => {
    try {
        await runTransaction(db, async (transaction) => {
            // 1. Satışı Oku
            const saleRef = doc(db, "sales", storeId, "receipts", saleId);
            const saleDoc = await transaction.get(saleRef);
            if (!saleDoc.exists()) throw "Satış bulunamadı";

            const sale = saleDoc.data() as Sale;
            const item = sale.items[itemIndex];
            const oldDeliveryStatus = item.deliveryStatus;

            // Durum değişmediyse çık
            if (oldDeliveryStatus === newDeliveryStatus) return;

            // 2. Stok Kartını Oku
            const uniqueStockId = `${item.productId}_${item.colorId}_${item.dimensionId || 'null'}`;
            const stockRef = doc(db, "stores", storeId, "stocks", uniqueStockId);
            const stockDoc = await transaction.get(stockRef);

            if (!stockDoc.exists()) {
                // Stok kartı yoksa bile sadece durumu güncelle, stok işlemi yapma (Veri bütünlüğü için uyarı verilebilir)
                sale.items[itemIndex].deliveryStatus = newDeliveryStatus;
                transaction.update(saleRef, { items: sale.items });
                return;
            }

            const sData = stockDoc.data();
            const qty = Number(item.quantity);
            const updates: any = {};

            // --- SENARYO 1: ÜRÜN TESLİM EDİLDİ YAPILIYORSA ---
            if (newDeliveryStatus === 'Teslim Edildi' && oldDeliveryStatus !== 'Teslim Edildi') {
                if (item.supplyMethod === 'Stoktan') {
                    // Rezerve stoktan düş (Çünkü satış anında Free -> Reserved yapmıştık)
                    updates.reservedStock = (sData.reservedStock || 0) - qty;
                } else if (item.supplyMethod === 'Merkezden') {
                    // Gelecek (Müşteri) stoktan düş (Çünkü satış anında oraya eklemiştik)
                    updates.incomingReservedStock = (sData.incomingReservedStock || 0) - qty;
                }
                // Not: Ürün fiziksel olarak mağazadan çıktığı için stok miktarı azalır.
            }

            // --- SENARYO 2: YANLIŞLIKLA TESLİM EDİLDİ DENMİŞ, GERİ ALINIYORSA ---
            else if (oldDeliveryStatus === 'Teslim Edildi' && newDeliveryStatus !== 'Teslim Edildi') {
                if (item.supplyMethod === 'Stoktan') {
                    // Rezerve stoğa geri ekle
                    updates.reservedStock = (sData.reservedStock || 0) + qty;
                } else if (item.supplyMethod === 'Merkezden') {
                    // Gelecek (Müşteri) stoğa geri ekle
                    updates.incomingReservedStock = (sData.incomingReservedStock || 0) + qty;
                }
            }

            // 3. Yazma İşlemleri
            if (Object.keys(updates).length > 0) {
                transaction.update(stockRef, updates);
            }

            sale.items[itemIndex].deliveryStatus = newDeliveryStatus;
            transaction.update(saleRef, { items: sale.items });
        });
    } catch (error) {
        console.error("Durum güncelleme hatası:", error);
        throw error;
    }
};