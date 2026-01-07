// src/services/saleService.ts
import { db } from "../firebase";
import { collection, getDocs, orderBy, query, doc, runTransaction } from "firebase/firestore";
import type { Sale } from "../types";

// Satış Kaydet ve Stoktan Düş
export const addSale = async (sale: Sale) => {
    try {
        await runTransaction(db, async (transaction) => {
            
            // 1. Önce Stokları Kontrol Et ve Hazırla (READ)
            const stockUpdates = [];

            for (const item of sale.items) {
                // Sadece 'İptal' veya 'İade' olmayanlar stoktan düşer.
                // Eğer durum 'Sipariş' veya 'Teslim' ise stok düşülmeli.
                if (item.status !== 'İptal' && item.status !== 'İade') {
                    const stockRef = doc(db, "stores", sale.storeId, "products", item.productId);
                    const stockDoc = await transaction.get(stockRef);
                    
                    let currentStock = 0;
                    if (stockDoc.exists()) {
                        currentStock = stockDoc.data().stock || 0;
                    }
                    
                    // Stok Yetersizliği Kontrolü (İstersen açabilirsin, şimdilik eksiye düşmeye izin veriyoruz)
                    // if (currentStock < item.quantity) throw new Error(`${item.productName} için yetersiz stok!`);

                    const newStock = currentStock - Number(item.quantity);
                    stockUpdates.push({ ref: stockRef, stock: newStock });
                }
            }

            // 2. Yazma İşlemleri (WRITE)
            
            // A) Satış Fişini Kaydet
            // sales/{storeId}/receipts/{autoId}
            const saleRef = doc(collection(db, "sales", sale.storeId, "receipts"));
            transaction.set(saleRef, sale);

            // B) Stokları Güncelle
            for (const update of stockUpdates) {
                transaction.set(update.ref, { stock: update.stock }, { merge: true });
            }
        });
    } catch (error) {
        console.error("Satış işlemi hatası:", error);
        throw error;
    }
};

// Mağazaya Göre Satışları Getir
export const getSalesByStore = async (storeId: string): Promise<Sale[]> => {
    try {
        const q = query(
            collection(db, "sales", storeId, "receipts"), 
            orderBy("date", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Sale[];
    } catch (error) {
        console.error("Satışlar çekilirken hata:", error);
        return [];
    }
};