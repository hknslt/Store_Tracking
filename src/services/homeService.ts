// src/services/homeService.ts
import { db } from "../firebase";
import { collection, getDocs, collectionGroup, query, where } from "firebase/firestore";
import type { Sale, Purchase } from "../types";

export interface DashboardData {
    stats: {
        totalStores: number;
        totalPersonnel: number;
        totalProducts: number;
        todayRevenue: number;
        todayExpense: number;
        todayNet: number;
        todaySalesCount: number;
        todayPurchasesCount: number;
    };
    todaySales: Sale[];
    todayPurchases: Purchase[];
}

export const getDashboardData = async (): Promise<DashboardData> => {
    try {
        // Bugünün Tarihi (YYYY-MM-DD)
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayString = `${year}-${month}-${day}`;

        // 1. Genel Sayıları Çek
        const [storesSnap, personnelSnap, productsSnap] = await Promise.all([
            getDocs(collection(db, "stores")),
            getDocs(collection(db, "personnel")),
            getDocs(collection(db, "products"))
        ]);

        // 2. TÜM FİŞLERİ ÇEK
        const allReceiptsQuery = query(
            collectionGroup(db, "receipts"),
            where("date", "==", todayString)
        );
        const allReceiptsSnap = await getDocs(allReceiptsQuery);

        // Verileri Ham Olarak Al
        const allReceipts = allReceiptsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

        // 3. AYRIŞTIRMA
        const todayPurchases = allReceipts.filter(r => r.type === 'Alış') as Purchase[];
        const todaySales = allReceipts.filter(r => r.type !== 'Alış') as Sale[];

        // 4. Günlük Hesaplamalar
        // Satışlarda 'grandTotal' kullanılır
        const todayRevenue = todaySales.reduce((acc, curr) => acc + Number(curr.grandTotal || 0), 0);

        // Alışlarda 'totalAmount' kullanılır (HATA DÜZELTİLDİ: grandTotal kaldırıldı)
        const todayExpense = todayPurchases.reduce((acc, curr) => acc + Number(curr.totalAmount || 0), 0);

        return {
            stats: {
                totalStores: storesSnap.size,
                totalPersonnel: personnelSnap.size,
                totalProducts: productsSnap.size,
                todayRevenue,
                todayExpense,
                todayNet: todayRevenue - todayExpense,
                todaySalesCount: todaySales.length,
                todayPurchasesCount: todayPurchases.length
            },
            todaySales,
            todayPurchases
        };

    } catch (error) {
        console.error("Dashboard verisi çekilemedi:", error);
        throw error;
    }
};