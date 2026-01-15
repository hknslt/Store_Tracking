// src/services/saleService.ts
import { db } from "../firebase";
import { collection, getDocs, orderBy, query, doc, runTransaction } from "firebase/firestore";
import type { Sale, DeliveryStatus, PendingRequest, Debt } from "../types";

export const addSale = async (sale: Sale) => {
    try {
        await runTransaction(db, async (transaction) => {

            // --- 1. AŞAMA: TÜM OKUMALAR (READS) ---
            const stockReads = [];

            for (const item of sale.items) {
                if (item.status === 'İptal' || item.status === 'İade') continue;

                const uniqueStockId = `${item.productId}_${item.colorId}_${item.dimensionId || 'null'}`;
                const stockRef = doc(db, "stores", sale.storeId, "stocks", uniqueStockId);
                const stockDoc = await transaction.get(stockRef);

                stockReads.push({
                    item: item,
                    ref: stockRef,
                    doc: stockDoc
                });
            }

            // --- 2. AŞAMA: HESAPLAMALAR ---
            const stockWrites: { ref: any, data: any }[] = [];
            const pendingRequests: PendingRequest[] = []; // Bekleyen Talepler Listesi

            // Satış ID'sini şimdiden belirliyoruz
            const saleRef = doc(collection(db, "sales", sale.storeId, "receipts"));

            const debtRef = doc(collection(db, "stores", sale.storeId, "debts")); // ID otomatik olsun veya saleRef.id kullanabiliriz

            const newDebt: Debt = {
                storeId: sale.storeId,
                saleId: saleRef.id,
                receiptNo: sale.receiptNo,
                customerName: sale.customerName,
                saleDate: sale.date,
                totalAmount: sale.grandTotal, // Nakliye dahil toplam
                paidAmount: 0,
                remainingAmount: sale.grandTotal,
                status: 'Ödenmedi'
            };


            for (const { item, ref, doc } of stockReads) {
                let currentData = {
                    freeStock: 0,
                    reservedStock: 0,
                    incomingReservedStock: 0,
                    productName: item.productName
                };

                if (doc.exists()) {
                    currentData = doc.data() as any;
                }

                const qty = Number(item.quantity);
                const updates: any = {
                    productId: item.productId,
                    colorId: item.colorId,
                    dimensionId: item.dimensionId || null,
                    productName: item.productName
                };

                if (item.supplyMethod === 'Stoktan') {
                    // Depodan verildiyse: Serbest düşer, Rezerve artar
                    updates.freeStock = (currentData.freeStock || 0) - qty;
                    updates.reservedStock = (currentData.reservedStock || 0) + qty;

                } else if (item.supplyMethod === 'Merkezden') {
                    // Merkezden istendiyse: Gelecek Rezerve (Müşteri için) artar.
                    updates.incomingReservedStock = (currentData.incomingReservedStock || 0) + qty;

                    // "Bekleyen Talep" (PendingRequest) oluştur.
                    const request: PendingRequest = {
                        storeId: sale.storeId,
                        saleId: saleRef.id,          // Bu talebin hangi satışa ait olduğu
                        saleReceiptNo: sale.receiptNo, // Fiş Numarası
                        customerName: sale.customerName, // Müşteri Adı

                        // Ürün Detayları
                        groupId: item.groupId,
                        categoryId: item.categoryId,
                        productId: item.productId,
                        productName: item.productName,
                        colorId: item.colorId,
                        cushionId: item.cushionId || "",
                        dimensionId: item.dimensionId || null,

                        quantity: qty,
                        requestDate: new Date().toISOString(),

                        // 👇 GÜNCELLEME: Ürün notunu buraya taşıyoruz
                        productNote: item.productNote
                    };

                    pendingRequests.push(request);
                }

                stockWrites.push({ ref: ref, data: updates });
            }

            // --- 3. AŞAMA: TÜM YAZMALAR (WRITES) ---

            // A) Satış Fişini Kaydet
            transaction.set(saleRef, sale);

            transaction.set(doc(db, "stores", sale.storeId, "debts", saleRef.id), newDebt);

            // B) Stokları Güncelle
            for (const w of stockWrites) {
                transaction.set(w.ref, w.data, { merge: true });
            }

            // C) Bekleyen Talepleri Kaydet
            for (const req of pendingRequests) {
                const reqRef = doc(collection(db, "stores", sale.storeId, "pending_requests"));
                transaction.set(reqRef, req);
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

// Bu fonksiyon zaten doğru mantıkta (Reserved stoktan düşüyor), aynen koruyoruz.
export const updateSaleItemStatus = async (
    storeId: string,
    saleId: string,
    itemIndex: number,
    newDeliveryStatus: DeliveryStatus
) => {
    try {
        await runTransaction(db, async (transaction) => {
            const saleRef = doc(db, "sales", storeId, "receipts", saleId);
            const saleDoc = await transaction.get(saleRef);
            if (!saleDoc.exists()) throw "Satış bulunamadı";

            const sale = saleDoc.data() as Sale;
            const item = sale.items[itemIndex];
            const oldDeliveryStatus = item.deliveryStatus;

            if (oldDeliveryStatus === newDeliveryStatus) return;

            const uniqueStockId = `${item.productId}_${item.colorId}_${item.dimensionId || 'null'}`;
            const stockRef = doc(db, "stores", storeId, "stocks", uniqueStockId);
            const stockDoc = await transaction.get(stockRef);

            const sData = stockDoc.exists() ? stockDoc.data() : { reservedStock: 0 };
            const qty = Number(item.quantity);
            const updates: any = {};

            // TESLİM EDİLDİ (Müşteriye gitti, Rezerve stoktan düşer)
            if (newDeliveryStatus === 'Teslim Edildi' && oldDeliveryStatus !== 'Teslim Edildi') {
                if ((sData.reservedStock || 0) < qty) {
                    throw new Error("Stok hatası: Teslim edilecek rezerve ürün bulunamadı. (Ürün 'Merkezden' ise henüz depoya girişi yapılmamış olabilir).");
                }
                updates.reservedStock = (sData.reservedStock || 0) - qty;
            }

            // GERİ ALMA
            else if (oldDeliveryStatus === 'Teslim Edildi' && newDeliveryStatus !== 'Teslim Edildi') {
                updates.reservedStock = (sData.reservedStock || 0) + qty;
            }

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

export const updateShippingCost = async (storeId: string, saleId: string, newCost: number) => {
    try {
        const saleRef = doc(db, "sales", storeId, "receipts", saleId);

        await runTransaction(db, async (transaction) => {
            const saleDoc = await transaction.get(saleRef);
            if (!saleDoc.exists()) throw "Satış bulunamadı";

            const sale = saleDoc.data() as Sale;

            // Yeni Grand Total Hesapla
            const itemsTotal = sale.items.reduce((acc, item) => acc + item.total, 0);
            const newGrandTotal = itemsTotal + newCost;

            transaction.update(saleRef, {
                shippingCost: newCost,
                grandTotal: newGrandTotal
            });
        });
    } catch (error) {
        console.error("Nakliye güncelleme hatası:", error);
        throw error;
    }
};


// --- SATIŞ İPTAL ETME (Stokları geri alır, Fişi 'İptal' işaretler) ---
export const cancelSaleComplete = async (storeId: string, saleId: string) => {
    try {
        await runTransaction(db, async (transaction) => {
            // 1. Satışı Getir
            const saleRef = doc(db, "sales", storeId, "receipts", saleId);
            const saleDoc = await transaction.get(saleRef);
            if (!saleDoc.exists()) throw "Satış bulunamadı.";
            const sale = saleDoc.data() as Sale;

            // 2. Stokları İade Et (Rezerve -> Serbest)
            for (const item of sale.items) {
                // Eğer ürün zaten teslim edildiyse, iptal yerine "İade" süreci gerekir. 
                // Biz burada henüz teslim edilmemiş veya teslim edilse bile stoğa geri sokulacak varsayıyoruz.

                const uniqueStockId = `${item.productId}_${item.colorId}_${item.dimensionId || 'null'}`;
                const stockRef = doc(db, "stores", storeId, "stocks", uniqueStockId);
                const stockDoc = await transaction.get(stockRef);

                if (stockDoc.exists()) {
                    const currentData = stockDoc.data();
                    const qty = Number(item.quantity);

                    // Satış yapılırken: Free azalmış, Reserved artmıştı.
                    // İptalde: Free artmalı, Reserved azalmalı.

                    const newFree = (currentData.freeStock || 0) + qty;

                    // Eğer ürün teslim edildiyse rezerve zaten düşmüştür, değilse rezerveden düş.
                    let newReserved = currentData.reservedStock || 0;
                    if (item.deliveryStatus !== 'Teslim Edildi') {
                        newReserved = Math.max(0, newReserved - qty);
                    }

                    transaction.update(stockRef, {
                        freeStock: newFree,
                        reservedStock: newReserved
                    });
                }
            }

            // 3. Borcu Sil (Veya İptal İşaretle - Biz siliyoruz ki bakiyeyi etkilemesin)
            const debtRef = doc(db, "stores", storeId, "debts", saleId);
            transaction.delete(debtRef);

            // 4. Satışın Durumunu Güncelle (Silmiyoruz, İptal Statüsüne Çekiyoruz)
            // Not: Sale tipine 'status' alanı eklenmeli veya items içindeki statüler güncellenmeli.
            // Biz items içindeki her ürünü 'İptal' yapalım.
            const updatedItems = sale.items.map(i => ({ ...i, deliveryStatus: 'İptal' }));
            transaction.update(saleRef, { items: updatedItems, grandTotal: 0, shippingCost: 0 }); // Tutarı sıfırla
        });
    } catch (error) {
        console.error("İptal hatası:", error);
        throw error;
    }
};

// --- SATIŞI TAMAMEN SİLME ---
export const deleteSaleComplete = async (storeId: string, saleId: string) => {
    try {
        await runTransaction(db, async (transaction) => {
            // 1. Satışı Oku
            const saleRef = doc(db, "sales", storeId, "receipts", saleId);
            const saleDoc = await transaction.get(saleRef);
            if (!saleDoc.exists()) throw "Satış bulunamadı.";
            const sale = saleDoc.data() as Sale;

            // 2. Stokları Geri Yükle
            for (const item of sale.items) {
                const uniqueStockId = `${item.productId}_${item.colorId}_${item.dimensionId || 'null'}`;
                const stockRef = doc(db, "stores", storeId, "stocks", uniqueStockId);
                const stockDoc = await transaction.get(stockRef);

                if (stockDoc.exists()) {
                    const currentData = stockDoc.data();
                    const qty = Number(item.quantity);

                    // Mantık İptal ile aynı: Stoğu geri koy
                    const newFree = (currentData.freeStock || 0) + qty;
                    let newReserved = currentData.reservedStock || 0;

                    if (item.deliveryStatus !== 'Teslim Edildi') {
                        newReserved = Math.max(0, newReserved - qty);
                    }

                    transaction.update(stockRef, {
                        freeStock: newFree,
                        reservedStock: newReserved
                    });
                }
            }

            // 3. Borcu Sil
            const debtRef = doc(db, "stores", storeId, "debts", saleId);
            transaction.delete(debtRef);

            // 4. Satış Kaydını Sil (Tamamen Yok Et)
            transaction.delete(saleRef);
        });
    } catch (error) {
        console.error("Silme hatası:", error);
        throw error;
    }
};