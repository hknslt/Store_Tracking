import { db } from "../firebase";
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";

// 1. Bir Mağazanın Bu Ayki Personel Satışlarını Getir
export const getMonthlySalesByPersonnel = async (storeId: string) => {
    try {
        // 1. BULUNULAN AYIN İLK GÜNÜNÜ HESAPLA (Örn: "2024-03-01")
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const firstDayOfMonth = `${year}-${month}-01`;

        // 2. SADECE BU AYIN SATIŞLARINI GETİR
        const q = query(
            collection(db, "sales", storeId, "receipts"),
            where("date", ">=", firstDayOfMonth)
        );

        const snapshot = await getDocs(q);
        const salesMap: Record<string, number> = {};

        snapshot.forEach(doc => {
            const data = doc.data();

            // İptal edilen satışları prime dahil etme
            if (data.status === 'İptal') return;

            const personnelId = data.personnelId;
            let amount = Number(data.grandTotal || 0);

            // Eğer grandTotal yoksa ürünlerden hesapla (eski veriler için yedek)
            if (amount === 0 && data.items) {
                amount = data.items.reduce((acc: any, i: any) => acc + (Number(i.price) * Number(i.quantity)), 0);
            }

            if (personnelId) {
                salesMap[personnelId] = (salesMap[personnelId] || 0) + amount;
            }
        });

        return salesMap;
    } catch (error) {
        console.error("Personel satışları çekilirken hata:", error);
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