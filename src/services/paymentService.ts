// src/services/paymentService.ts
import { db } from "../firebase";
import { collection, addDoc, getDocs, doc, deleteDoc, query, orderBy, runTransaction, where } from "firebase/firestore";
import type { PaymentMethod, PaymentDocument, Debt } from "../types";

// --- ÖDEME YÖNTEMİ TANIMLARI (Nakit, KK vb.) ---
export const addPaymentMethod = async (name: string) => {
    await addDoc(collection(db, "definitions", "payment_methods", "items"), { name });
};

export const getPaymentMethods = async (): Promise<PaymentMethod[]> => {
    const q = query(collection(db, "definitions", "payment_methods", "items"), orderBy("name"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PaymentMethod[];
};

export const deletePaymentMethod = async (id: string) => {
    await deleteDoc(doc(db, "definitions", "payment_methods", "items", id));
};

// --- ÖDEME FİŞİ KAYDETME ---
export const addPaymentDocument = async (payment: PaymentDocument) => {
    try {
        await runTransaction(db, async (transaction) => {

            // --- 1. AŞAMA: OKUMA İŞLEMLERİ (READS) ---
            // Önce borç kayıtlarını okumalıyız. Henüz hiçbir şey YAZMIYORUZ.

            const debtReads: { ref: any, doc: any, amount: number }[] = [];

            for (const item of payment.items) {
                if (item.type === 'Tahsilat' && item.saleId) {
                    const debtRef = doc(db, "stores", payment.storeId, "debts", item.saleId);
                    const debtDoc = await transaction.get(debtRef);

                    if (debtDoc.exists()) {
                        debtReads.push({
                            ref: debtRef,
                            doc: debtDoc,
                            amount: Number(item.amount)
                        });
                    }
                }
            }

            // --- 2. AŞAMA: YAZMA İŞLEMLERİ (WRITES) ---
            // Artık okuma bitti, yazma işlemlerine geçebiliriz.

            // A) Ödeme Belgesini Kaydet
            const paymentRef = doc(collection(db, "payments"));
            transaction.set(paymentRef, payment);

            // B) Borçları Güncelle
            for (const readData of debtReads) {
                const debt = readData.doc.data() as Debt;

                const newPaid = (debt.paidAmount || 0) + readData.amount;
                const newRemaining = debt.totalAmount - newPaid;

                let newStatus: Debt['status'] = 'Kısmi Ödeme';
                if (newRemaining <= 0.1) newStatus = 'Ödendi'; // Küsürat hatası olmasın diye 0.1 altı ödendi sayılır
                if (newPaid === 0) newStatus = 'Ödenmedi';

                transaction.update(readData.ref, {
                    paidAmount: newPaid,
                    remainingAmount: newRemaining,
                    status: newStatus,
                    lastPaymentDate: payment.date
                });
            }
        });
    } catch (error) {
        console.error("Ödeme kayıt hatası:", error);
        throw error;
    }
};


export const getPaymentsByStore = async (storeId: string): Promise<PaymentDocument[]> => {
    try {
        // Tarihe göre tersten sırala (En yeni en üstte)
        const q = query(
            collection(db, "payments"),
            where("storeId", "==", storeId),
            orderBy("date", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PaymentDocument[];
    } catch (error) {
        console.error("Ödeme listesi hatası:", error);
        return [];
    }
};