// src/services/debtService.ts
import { db } from "../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import type { Debt } from "../types";

// MAĞAZANIN BORÇ LİSTESİNİ GETİR (Ödeme sayfasında kullanacağız)
export const getDebtsByStore = async (storeId: string): Promise<Debt[]> => {
    try {
        // Sadece borcu bitmemiş olanları getirmek isterseniz .where('status', '!=', 'Ödendi') ekleyebilirsiniz.
        // Ama şimdilik hepsini çekelim, ödenenleri de görelim.
        const q = query(
            collection(db, "stores", storeId, "debts"),
            orderBy("saleDate", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Debt[];
    } catch (error) {
        console.error("Borç listesi hatası:", error);
        return [];
    }
};