// src/services/paymentService.ts
import { db } from "../firebase";
import {
    collection,
    addDoc,
    getDocs,
    doc,
    deleteDoc,
    query,
    orderBy,
    runTransaction,
    increment,
    where,
    updateDoc
} from "firebase/firestore";
import type { PaymentMethod, PaymentDocument, Debt } from "../types";

// --- ÖDEME YÖNTEMİ TANIMLARI ---
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

export const updatePaymentMethod = async (id: string, name: string) => {
    const ref = doc(db, "definitions", "payment_methods", "items", id);
    await updateDoc(ref, { name });
};

// --- ÖDEME FİŞİ KAYDETME ---
export const addPaymentDocument = async (payment: PaymentDocument) => {
    try {
        await runTransaction(db, async (transaction) => {

            // --- 1. AŞAMA: OKUMA İŞLEMLERİ (READS) ---
            const debtReads: { ref: any, doc: any, amount: number }[] = [];

            // Borçları oku (Sadece Tahsilat ise ve TL karşılığı üzerinden düşülür)
            for (const item of payment.items) {
                if (item.type === 'Tahsilat' && item.saleId) {
                    const debtRef = doc(db, "stores", payment.storeId, "debts", item.saleId);
                    const debtDoc = await transaction.get(debtRef);

                    if (debtDoc.exists()) {
                        // Borçtan Düşülecek Tutar = TL Karşılığı (item.amount)
                        debtReads.push({
                            ref: debtRef,
                            doc: debtDoc,
                            amount: Number(item.amount)
                        });
                    }
                }
            }

            // --- HESAPLAMA: Her Para Birimi İçin Ayrı Değişim ---
            const balanceChanges = {
                TL: 0,
                USD: 0,
                EUR: 0,
                GBP: 0
            };

            for (const item of payment.items) {
                // Kasaya girecek/çıkacak miktar = ORJİNAL MİKTAR (Döviz ise döviz miktarı, TL ise TL)
                // Eğer originalAmount yoksa (eski kayıt vs.) amount kullanılır.
                const realAmount = Number(item.originalAmount || item.amount);
                const currency = item.currency || 'TL'; // Varsayılan TL

                if (item.type === 'Tahsilat' || item.type === 'E/F') {
                    // Kasaya Para Girer (+100 USD gibi)
                    // Not: E/F pozitif girilirse artar (Arayüzde kontrol edilmeli)
                    balanceChanges[currency] += realAmount;
                } else if (item.type === 'Masraf' || item.type === 'Merkez') {
                    // Kasadan Para Çıkar (-100 USD gibi)
                    balanceChanges[currency] -= realAmount;
                }
            }

            // --- 2. AŞAMA: YAZMA İŞLEMLERİ (WRITES) ---

            // A) Ödeme Belgesini Kaydet
            const paymentRef = doc(collection(db, "payments"));
            transaction.set(paymentRef, payment);

            // B) Borçları Güncelle (TL Karşılığı Üzerinden)
            for (const readData of debtReads) {
                const debt = readData.doc.data() as Debt;

                // Borçtan düşülecek tutar (TL)
                const newPaid = (debt.paidAmount || 0) + readData.amount;
                const newRemaining = debt.totalAmount - newPaid;

                let newStatus: Debt['status'] = 'Kısmi Ödeme';
                if (newRemaining <= 0.5) newStatus = 'Ödendi'; // Küsürat toleransı
                if (newPaid === 0) newStatus = 'Ödenmedi';

                transaction.update(readData.ref, {
                    paidAmount: newPaid,
                    remainingAmount: newRemaining,
                    status: newStatus,
                    lastPaymentDate: payment.date
                });
            }

            // C) 💰 MAĞAZA KASALARINI AYRI AYRI GÜNCELLE
            // Firestore "dot notation" (nokta) ile iç objeleri (currentBalance.USD gibi) güncelleyebilir.
            const storeRef = doc(db, "stores", payment.storeId);

            const updates: any = {};

            // Sadece değişen kasaları güncelle (Gereksiz yazma yapmamak için)
            if (balanceChanges.TL !== 0) updates["currentBalance.TL"] = increment(balanceChanges.TL);
            if (balanceChanges.USD !== 0) updates["currentBalance.USD"] = increment(balanceChanges.USD);
            if (balanceChanges.EUR !== 0) updates["currentBalance.EUR"] = increment(balanceChanges.EUR);
            if (balanceChanges.GBP !== 0) updates["currentBalance.GBP"] = increment(balanceChanges.GBP);

            // Eğer herhangi bir güncelleme varsa yap
            if (Object.keys(updates).length > 0) {
                transaction.update(storeRef, updates);
            }

        });
    } catch (error) {
        console.error("Ödeme ve Kasa Güncelleme hatası:", error);
        throw error;
    }
};

export const getPaymentsByStore = async (storeId: string): Promise<PaymentDocument[]> => {
    try {
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