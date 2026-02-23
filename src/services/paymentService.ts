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
    updateDoc,
    limit,
    getDoc
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

        const checkQuery = query(
            collection(db, "payments"),
            where("storeId", "==", payment.storeId),
            where("receiptNo", "==", payment.receiptNo)
        );
        const checkSnap = await getDocs(checkQuery);

        if (!checkSnap.empty) {
            throw new Error(`Bu makbuz numarası (${payment.receiptNo}) zaten kullanılmış! Lütfen farklı bir numara girin.`);
        }
        await runTransaction(db, async (transaction) => {
            // 1. Borç Okumaları
            const debtReads: { ref: any, doc: any, amount: number }[] = [];
            for (const item of payment.items) {
                if (item.type === 'Tahsilat' && item.saleId) {
                    const debtRef = doc(db, "stores", payment.storeId, "debts", item.saleId);
                    const debtDoc = await transaction.get(debtRef);
                    if (debtDoc.exists()) debtReads.push({ ref: debtRef, doc: debtDoc, amount: Number(item.amount) });
                }
            }

            // 🔥 HESAPLAMA: Ödeme Yöntemi ID'sine göre grupla
            // Örn: { "methodId1": { TL: 100, USD: 0... }, "methodId2": { TL: -50, USD: 0... } }
            const balanceChanges: Record<string, { TL: number; USD: number; EUR: number; GBP: number }> = {};

            for (const item of payment.items) {
                const methodId = item.paymentMethodId;
                if (!methodId) continue;

                if (!balanceChanges[methodId]) {
                    balanceChanges[methodId] = { TL: 0, USD: 0, EUR: 0, GBP: 0 };
                }

                const realAmount = Number(item.originalAmount || item.amount);
                const currency = item.currency || 'TL';

                if (item.type === 'Tahsilat' || item.type === 'E/F') {
                    balanceChanges[methodId][currency] += realAmount;
                } else if (item.type === 'Masraf' || item.type === 'Merkez') {
                    balanceChanges[methodId][currency] -= realAmount;
                }
            }

            // 2. YAZMA İŞLEMLERİ
            const paymentRef = doc(collection(db, "payments"));
            transaction.set(paymentRef, payment);

            // Borçları Güncelle
            for (const readData of debtReads) {
                const debt = readData.doc.data() as Debt;
                const newPaid = (debt.paidAmount || 0) + readData.amount;
                const newRemaining = debt.totalAmount - newPaid;
                let newStatus: Debt['status'] = 'Kısmi Ödeme';
                if (newRemaining <= 0.5) newStatus = 'Ödendi';
                if (newPaid === 0) newStatus = 'Ödenmedi';
                transaction.update(readData.ref, { paidAmount: newPaid, remainingAmount: newRemaining, status: newStatus, lastPaymentDate: payment.date });
            }

            // 🔥 KASALARI ÖDEME YÖNTEMİNE GÖRE GÜNCELLE (Dot Notation)
            const storeRef = doc(db, "stores", payment.storeId);
            const updates: any = {};

            for (const mId in balanceChanges) {
                if (balanceChanges[mId].TL !== 0) updates[`currentBalance.${mId}.TL`] = increment(balanceChanges[mId].TL);
                if (balanceChanges[mId].USD !== 0) updates[`currentBalance.${mId}.USD`] = increment(balanceChanges[mId].USD);
                if (balanceChanges[mId].EUR !== 0) updates[`currentBalance.${mId}.EUR`] = increment(balanceChanges[mId].EUR);
                if (balanceChanges[mId].GBP !== 0) updates[`currentBalance.${mId}.GBP`] = increment(balanceChanges[mId].GBP);
            }

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

export const getNextPaymentReceiptNo = async (storeId: string): Promise<string> => {
    try {
        // Mağazaya ait ödemeleri oluşturulma tarihine göre tersten çek (En yeniler)
        const q = query(
            collection(db, "payments"),
            where("storeId", "==", storeId),
            orderBy("createdAt", "desc"), // En son eklenenleri getir
            limit(50) // Son 50 işlemi kontrol et (Sıralama hatasını önlemek için havuz)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return "1"; // İlk kayıt
        }

        let maxNumber = 0;

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            // receiptNo alanını sayıya çevirmeyi dene
            const receiptNo = Number(data.receiptNo);

            // Eğer geçerli bir sayıysa ve şu anki max'tan büyükse, yeni max o'dur.
            if (!isNaN(receiptNo) && receiptNo > maxNumber) {
                maxNumber = receiptNo;
            }
        });

        // En büyük sayıyı 1 artır ve string olarak döndür
        return (maxNumber + 1).toString();

    } catch (error) {
        console.error("Makbuz no hatası:", error);
        // Hata durumunda timestamp döndür (Çakışmayı önlemek için)
        return Date.now().toString().slice(-6);
    }
};

export const getPaymentById = async (id: string): Promise<PaymentDocument | null> => {
    try {
        const docRef = doc(db, "payments", id);
        const snapshot = await getDoc(docRef);
        return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as PaymentDocument : null;
    } catch (error) {
        console.error("Ödeme detay hatası:", error);
        return null;
    }
};


export const updatePaymentDocument = async (id: string, newPayment: PaymentDocument) => {
    try {
        await runTransaction(db, async (transaction) => {
            const paymentRef = doc(db, "payments", id);
            const paymentDoc = await transaction.get(paymentRef);
            if (!paymentDoc.exists()) throw new Error("Güncellenecek ödeme bulunamadı.");
            const oldPayment = paymentDoc.data() as PaymentDocument;

            const saleIds = new Set<string>();
            oldPayment.items.forEach(i => { if (i.type === 'Tahsilat' && i.saleId) saleIds.add(i.saleId); });
            newPayment.items.forEach(i => { if (i.type === 'Tahsilat' && i.saleId) saleIds.add(i.saleId); });

            const debtDocs: Record<string, { ref: any, data: Debt }> = {};
            for (const saleId of saleIds) {
                const debtRef = doc(db, "stores", newPayment.storeId, "debts", saleId);
                const dDoc = await transaction.get(debtRef);
                if (dDoc.exists()) debtDocs[saleId] = { ref: debtRef, data: dDoc.data() as Debt };
            }

            const debtDifferences: Record<string, number> = {};
            oldPayment.items.forEach(i => { if (i.type === 'Tahsilat' && i.saleId) debtDifferences[i.saleId] = (debtDifferences[i.saleId] || 0) - Number(i.amount); });
            newPayment.items.forEach(i => { if (i.type === 'Tahsilat' && i.saleId) debtDifferences[i.saleId] = (debtDifferences[i.saleId] || 0) + Number(i.amount); });

            // 🔥 KASA FARKLARINI ÖDEME YÖNTEMİNE GÖRE HESAPLA
            const balanceDiff: Record<string, { TL: number; USD: number; EUR: number; GBP: number }> = {};
            const initMethod = (mId: string) => { if (!balanceDiff[mId]) balanceDiff[mId] = { TL: 0, USD: 0, EUR: 0, GBP: 0 }; };

            // Eski işlemi TERSİNE çevir
            oldPayment.items.forEach(i => {
                if (!i.paymentMethodId) return;
                initMethod(i.paymentMethodId);
                const amt = Number(i.originalAmount || i.amount);
                const cur = i.currency || 'TL';
                if (i.type === 'Tahsilat' || i.type === 'E/F') balanceDiff[i.paymentMethodId][cur] -= amt;
                else balanceDiff[i.paymentMethodId][cur] += amt;
            });

            // Yeni işlemi UYGULA
            newPayment.items.forEach(i => {
                if (!i.paymentMethodId) return;
                initMethod(i.paymentMethodId);
                const amt = Number(i.originalAmount || i.amount);
                const cur = i.currency || 'TL';
                if (i.type === 'Tahsilat' || i.type === 'E/F') balanceDiff[i.paymentMethodId][cur] += amt;
                else balanceDiff[i.paymentMethodId][cur] -= amt;
            });

            transaction.update(paymentRef, { ...newPayment, updatedAt: new Date() });

            for (const saleId in debtDifferences) {
                const diff = debtDifferences[saleId];
                if (diff !== 0 && debtDocs[saleId]) {
                    const debt = debtDocs[saleId].data;
                    const newPaid = (debt.paidAmount || 0) + diff;
                    const newRemaining = debt.totalAmount - newPaid;
                    let newStatus: Debt['status'] = 'Kısmi Ödeme';
                    if (newRemaining <= 0.5) newStatus = 'Ödendi';
                    if (newPaid <= 0) newStatus = 'Ödenmedi';
                    transaction.update(debtDocs[saleId].ref, { paidAmount: newPaid, remainingAmount: newRemaining, status: newStatus });
                }
            }

            // 🔥 GÜNCEL KASAYI YAZ
            const storeRef = doc(db, "stores", newPayment.storeId);
            const updates: any = {};
            for (const mId in balanceDiff) {
                if (balanceDiff[mId].TL !== 0) updates[`currentBalance.${mId}.TL`] = increment(balanceDiff[mId].TL);
                if (balanceDiff[mId].USD !== 0) updates[`currentBalance.${mId}.USD`] = increment(balanceDiff[mId].USD);
                if (balanceDiff[mId].EUR !== 0) updates[`currentBalance.${mId}.EUR`] = increment(balanceDiff[mId].EUR);
                if (balanceDiff[mId].GBP !== 0) updates[`currentBalance.${mId}.GBP`] = increment(balanceDiff[mId].GBP);
            }

            if (Object.keys(updates).length > 0) {
                transaction.update(storeRef, updates);
            }
        });
    } catch (error) {
        console.error("Ödeme güncelleme hatası:", error);
        throw error;
    }
};


// --- MERKEZ TRANSFERLERİ ÖZEL LİSTESİ ---
export const getCenterTransfers = async (storeId?: string) => {
    try {
        let q;
        if (storeId) {
            // Mağaza kullanıcısı ise sadece kendi mağazasının ödemelerini çek
            q = query(collection(db, "payments"), where("storeId", "==", storeId), orderBy("date", "desc"));
        } else {
            // Admin ise tüm mağazaların ödemelerini çek
            q = query(collection(db, "payments"), orderBy("date", "desc"));
        }

        const snapshot = await getDocs(q);
        const allPayments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PaymentDocument[];

        // Sadece 'Merkez' tipindeki işlemleri düzleştirerek (flatten) diziye çıkarıyoruz
        const centerTransfers: any[] = [];

        allPayments.forEach(payment => {
            payment.items.forEach((item, index) => {
                if (item.type === 'Merkez') {
                    centerTransfers.push({
                        paymentId: payment.id,
                        storeId: payment.storeId,
                        receiptNo: payment.receiptNo,
                        date: payment.date,
                        personnelName: payment.personnelName,
                        itemIndex: index, // Hangi satır olduğunu bilmek için
                        ...item
                    });
                }
            });
        });

        return centerTransfers;
    } catch (error) {
        console.error("Merkez transferleri çekilirken hata:", error);
        return [];
    }
};

// --- MERKEZ ONAY TİKİ GÜNCELLEME ---
export const toggleCenterTransferCheck = async (paymentId: string, itemIndex: number, currentStatus: boolean) => {
    try {
        const docRef = doc(db, "payments", paymentId);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
            const data = snap.data() as PaymentDocument;
            data.items[itemIndex].isCenterChecked = !currentStatus; // Durumu tersine çevir

            await updateDoc(docRef, { items: data.items });
            return !currentStatus;
        }
    } catch (error) {
        console.error("Onay güncellenirken hata:", error);
        throw error;
    }
};