import { db } from "../firebase";
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import type { Sale } from "../types";

// 1. Bir Mağazanın Bu Ayki Personel Satışlarını Getir
export const getMonthlySalesByPersonnel = async (storeId: string) => {
    try {
        const now = new Date();
        // Ayın 1'inden itibaren (YYYY-MM-01)
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

        const q = query(
            collection(db, "sales", storeId, "receipts"),
            where("date", ">=", firstDay)
        );

        const snapshot = await getDocs(q);

        // Personel bazlı toplama
        const salesMap: Record<string, number> = {}; // { "personnelId": 50000 }

        snapshot.docs.forEach(doc => {
            const sale = doc.data() as Sale;
            // İptal edilen satışları dahil etme
            if ((sale as any).status === 'İptal') return;

            const pid = sale.personnelId;
            const total = Number(sale.grandTotal || 0);

            salesMap[pid] = (salesMap[pid] || 0) + total;
        });

        return salesMap;

    } catch (error) {
        console.error("Satış verisi çekme hatası:", error);
        return {};
    }
};

// 2. Mağaza Prim Modelini Güncelle (Hedefli / Düz)
export const updateStoreCommissionModel = async (storeId: string, model: 'target_based' | 'flat_rate') => {
    const ref = doc(db, "stores", storeId);
    await updateDoc(ref, { commissionModel: model });
};

// 3. Personel Prim Oranını Güncelle
export const updatePersonnelCommissionRate = async (personnelId: string, rate: number) => {
    const ref = doc(db, "personnel", personnelId);
    await updateDoc(ref, { commissionRate: rate });
};