// src/services/saleService.ts
import { db } from "../firebase";
import { collection, getDocs, orderBy, query, doc, runTransaction } from "firebase/firestore";
import type { Sale } from "../types";

export const addSale = async (sale: Sale) => {
    try {
        await runTransaction(db, async (transaction) => {
            
            const stockUpdates = [];

            for (const item of sale.items) {
                // Sadece stoktan düşülmesi gereken durumlar (İade ve İptal hariç)
                if (item.status !== 'İptal' && item.status !== 'İade') {
                    
                    // AYNI STOK ID MANTIĞI: "Ürün_Renk_Ebat"
                    const uniqueStockId = `${item.productId}_${item.colorId}_${item.dimensionId || 'null'}`;
                    
                    const stockRef = doc(db, "stores", sale.storeId, "stocks", uniqueStockId);
                    const stockDoc = await transaction.get(stockRef);
                    
                    let currentStock = 0;
                    if (stockDoc.exists()) {
                        currentStock = stockDoc.data().quantity || 0;
                    }
                    
                    // Stoktan Düş
                    const newStock = currentStock - Number(item.quantity);
                    
                    // İstersen burada eksi stok kontrolü yapabilirsin
                    // if (newStock < 0) throw "Yetersiz Stok";

                    stockUpdates.push({ ref: stockRef, quantity: newStock });
                }
            }

            // YAZMA İŞLEMLERİ
            const saleRef = doc(collection(db, "sales", sale.storeId, "receipts"));
            transaction.set(saleRef, sale);

            for (const update of stockUpdates) {
                transaction.update(update.ref, { quantity: update.quantity });
            }
        });
    } catch (error) {
        console.error("Satış hatası:", error);
        throw error;
    }
};

// ... (getSalesByStore aynı kalacak)
export const getSalesByStore = async (storeId: string): Promise<Sale[]> => {
    const q = query(collection(db, "sales", storeId, "receipts"), orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Sale[];
};