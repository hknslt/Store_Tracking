// src/services/homeService.ts
import { db } from "../firebase";
import { collection, getDocs, collectionGroup, query, where, orderBy } from "firebase/firestore";
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

export const getLast7DaysSales = async () => {
    try {
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 6); // Bugün dahil son 7 gün
        
        const dateString = sevenDaysAgo.toISOString().split('T')[0];

        // Tüm "receipts" koleksiyonlarını çek (Satış + Alış)
        // NOT: Eğer konsolda "Index required" hatası alırsanız linke tıklayıp index oluşturun.
        const q = query(
            collectionGroup(db, "receipts"),
            where("date", ">=", dateString),
            orderBy("date", "asc")
        );

        const snapshot = await getDocs(q);
        
        // Son 7 günü sıfır değeriyle hazırla
        const dataMap = new Map<string, number>();
        const chartData = [];
        
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const isoDate = d.toISOString().split('T')[0];
            const displayDate = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }); // Örn: "23 Oca"
            
            dataMap.set(isoDate, 0);
            chartData.push({ date: isoDate, name: displayDate, total: 0 });
        }

        snapshot.forEach(doc => {
            // Sadece "sales" klasörü altındakileri al (Alışları filtrele)
            if (doc.ref.path.includes("sales")) {
                const data = doc.data();
                // İptal edilmemişleri topla
                if (data.status !== 'İptal') {
                    const date = data.date;
                    if (dataMap.has(date)) {
                        const current = dataMap.get(date) || 0;
                        dataMap.set(date, current + Number(data.grandTotal || 0));
                    }
                }
            }
        });

        // Grafik formatına çevir
        return chartData.map(item => ({
            name: item.name,
            total: dataMap.get(item.date) || 0
        }));

    } catch (error) {
        console.error("Grafik verisi çekilemedi:", error);
        return [];
    }
};