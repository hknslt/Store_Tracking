// src/services/saleService.ts
import { db } from "../firebase";
import { collection, getDocs, orderBy, query, doc, runTransaction, collectionGroup, limit } from "firebase/firestore";
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
            const newGrandTotal = itemsTotal;

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

            // 2. Stokları Geri Al
            for (const item of sale.items) {
                // İptal edilmiş satırları atla
                if (item.status === 'İptal' || item.deliveryStatus === 'İptal') continue;

                const uniqueStockId = `${item.productId}_${item.colorId}_${item.dimensionId || 'null'}`;
                const stockRef = doc(db, "stores", storeId, "stocks", uniqueStockId);
                const stockDoc = await transaction.get(stockRef);

                if (stockDoc.exists()) {
                    const currentData = stockDoc.data();
                    const qty = Number(item.quantity);

                    // A) Eğer ürün "Merkezden" istendiyse ve henüz teslim edilmediyse:
                    // "Gelecek (Müşteri)" stoktan düşülmeli.
                    if (item.supplyMethod === 'Merkezden' && item.deliveryStatus !== 'Teslim Edildi') {
                        const newIncomingReserved = Math.max(0, (currentData.incomingReservedStock || 0) - qty);
                        transaction.update(stockRef, {
                            incomingReservedStock: newIncomingReserved
                        });
                    }
                    // B) Eğer ürün "Stoktan" verildiyse (veya Merkezden gelip depoya girdiyse):
                    // "Rezerve" düşülmeli, "Serbest" artırılmalı.
                    else {
                        const newFree = (currentData.freeStock || 0) + qty;
                        let newReserved = currentData.reservedStock || 0;

                        // Teslim edilmediyse rezerveden düş
                        if (item.deliveryStatus !== 'Teslim Edildi') {
                            newReserved = Math.max(0, newReserved - qty);
                        }

                        transaction.update(stockRef, {
                            freeStock: newFree,
                            reservedStock: newReserved
                        });
                    }
                }
            }

            // 3. Borcu Sil
            const debtRef = doc(db, "stores", storeId, "debts", saleId);
            transaction.delete(debtRef);

            // 4. Satışın Statüsünü 'İptal' Olarak İşaretle
            // (Not: Komple silmek yerine iptal statüsüne çekiyoruz ki kayıtlarda kalsın)
            const updatedItems = sale.items.map(i => ({ ...i, deliveryStatus: 'İptal' as DeliveryStatus, status: 'İptal' as any }));
            transaction.update(saleRef, {
                items: updatedItems,
                grandTotal: 0,
                shippingCost: 0,
                status: 'İptal' // Eğer Sale tipinde status varsa
            });
        });

        // NOT: Bekleyen Talepler (Pending Requests) koleksiyonundan silme işlemi
        // Transaction dışında yapılabilir çünkü query gerektirir.
        // İsteğe bağlı: Bekleyen talepleri temizle
        // const q = query(collection(db, "stores", storeId, "pending_requests"), where("saleId", "==", saleId));
        // const snaps = await getDocs(q);
        // snaps.forEach(d => deleteDoc(d.ref));

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

export const getSales = async (): Promise<Sale[]> => {
    try {
        // "receipts" ismindeki tüm alt koleksiyonları bulup tarihe göre sıralar
        const q = query(
            collectionGroup(db, "receipts"),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Tarih verisi Timestamp ise Date/String formatına çeviriyoruz ki patlamasın
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
            } as Sale;
        });
    } catch (error) {
        console.error("Tüm satışlar çekilirken hata:", error);
        return [];
    }
};


export const getNextReceiptNo = async (storeId: string): Promise<string> => {
    try {
        // En son oluşturulan fişi çek (createdAt'e göre)
        const q = query(
            collection(db, "sales", storeId, "receipts"),
            orderBy("createdAt", "desc"),
            limit(1)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return `1`;
        }

        const lastReceipt = snapshot.docs[0].data().receiptNo;

        // Fiş numarasındaki son sayısal kısmı bul ve artır
        // Örn: "2024-055" -> "2024-056", "F-12" -> "F-13"
        return incrementString(lastReceipt);

    } catch (error) {
        console.error("Fiş no getirme hatası:", error);
        return "";
    }
};

// Yardımcı: String içindeki sayıyı artırır
function incrementString(str: string): string {
    // Stringin sonundaki sayıyı bul
    const match = str.match(/(\d+)$/);
    if (match) {
        const numberStr = match[0];
        const numberLength = numberStr.length;
        const number = parseInt(numberStr, 10);
        const nextNumber = number + 1;

        // Sıfır dolgusunu koru (001 -> 002)
        const nextNumberStr = nextNumber.toString().padStart(numberLength, '0');

        // Eski sayıyı yeni sayıyla değiştir
        return str.substring(0, str.length - numberLength) + nextNumberStr;
    }
    // Sayı bulunamazsa sonuna -1 ekle
    return str + "-1";
}