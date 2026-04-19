// src/services/commissionService.ts
import { db } from "../firebase";
import { collection, getDocs, query, where, doc, updateDoc, getDoc, setDoc } from "firebase/firestore";

// 🔥 GÜNCELLENDİ: Artık dışarıdan Year ve Month alıyor (Geçmiş aylar için)
export const getMonthlySalesByPersonnel = async (storeId: string, targetYear?: number, targetMonth?: number) => {
    try {
        const now = new Date();
        const year = targetYear || now.getFullYear();
        const month = targetMonth || now.getMonth() + 1; // Eğer verilmezse bu ay

        const monthString = String(month).padStart(2, '0');

        // Ayın ilk ve son gününü bul (örn: 2024-03-01 ve 2024-03-31)
        const firstDayOfMonth = `${year}-${monthString}-01`;

        // JavaScript'te bir sonraki ayın 0. günü, bu ayın son gününü verir
        const lastDayObj = new Date(year, month, 0);
        const lastDayString = `${year}-${monthString}-${String(lastDayObj.getDate()).padStart(2, '0')}`;

        // Seçilen ayın 1'i ile Son Günü arasındaki satışları getir
        const q = query(
            collection(db, "sales", storeId, "receipts"),
            where("date", ">=", firstDayOfMonth),
            where("date", "<=", lastDayString)
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

export const savePastCommissionRecord = async (storeId: string, year: number, month: number, data: any) => {
    try {
        // Her mağazanın o ayki kaydı için benzersiz bir ID oluşturuyoruz (Örn: mağazaId_2024_5)
        const docId = `${storeId}_${year}_${month}`;
        const ref = doc(db, "past_commissions", docId);
        
        // merge: true ile var olan veriyi ezmeden güncelleriz
        await setDoc(ref, { 
            ...data, 
            storeId, 
            year, 
            month, 
            updatedAt: new Date().toISOString() 
        }, { merge: true });
    } catch (error) {
        console.error("Geçmiş prim kaydedilirken hata:", error);
        throw error;
    }
};

export const getPastCommissionRecord = async (storeId: string, year: number, month: number) => {
    try {
        const docId = `${storeId}_${year}_${month}`;
        const ref = doc(db, "past_commissions", docId);
        const snap = await getDoc(ref);
        
        if (snap.exists()) {
            return snap.data();
        }
        return null;
    } catch (error) {
        console.error("Geçmiş prim çekilirken hata:", error);
        return null;
    }
};