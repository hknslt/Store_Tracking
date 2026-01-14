// src/services/debtService.ts
import { db } from "../firebase";
import { collection, getDocs, doc, getDoc, query, orderBy } from "firebase/firestore";
import type { Debt } from "../types";

// Mağazaya göre borçları getir
export const getDebtsByStore = async (storeId: string): Promise<Debt[]> => {
    try {
        // stores -> [storeId] -> debts koleksiyonuna git
        const debtsRef = collection(db, "stores", storeId, "debts");

        // Verileri çek
        const snapshot = await getDocs(debtsRef);

        // Veriyi tipimize uygun hale getir ve döndür
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Debt[];

    } catch (error) {
        console.error("Borç getirme hatası:", error);
        return [];
    }
};

// Tek bir borç kaydını getir (Gerekirse diye)
export const getDebtById = async (storeId: string, debtId: string): Promise<Debt | null> => {
    try {
        const docRef = doc(db, "stores", storeId, "debts", debtId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Debt;
        }
        return null;
    } catch (error) {
        return null;
    }
};