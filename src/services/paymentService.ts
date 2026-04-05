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
    getDoc,
} from "firebase/firestore";
import type { PaymentMethod, PaymentDocument, TransactionType } from "../types";

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
            // AYNI FİŞ İÇİNDEKİ AYNI MÜŞTERİ (SALE_ID) ÖDEMELERİNİ GRUPLA
            const debtReductions: Record<string, number> = {};
            for (const item of payment.items) {
                if (item.type === 'Tahsilat' && item.saleId) {
                    debtReductions[item.saleId] = (debtReductions[item.saleId] || 0) + Number(item.amount);
                }
            }

            // KASA HESAPLAMALARI
            const balanceChanges: Record<string, { TL: number; USD: number; EUR: number; GBP: number }> = {};
            for (const item of payment.items) {
                const methodId = item.paymentMethodId;
                if (!methodId) continue;
                if (!balanceChanges[methodId]) balanceChanges[methodId] = { TL: 0, USD: 0, EUR: 0, GBP: 0 };

                const realAmount = Number(item.originalAmount || item.amount);
                const currency = item.currency || 'TL';

                if (item.type === 'Tahsilat' || item.type === 'E/F') balanceChanges[methodId][currency] += realAmount;
                else if (item.type === 'Masraf' || item.type === 'Merkez') balanceChanges[methodId][currency] -= realAmount;
            }

            // 1. Ödemeyi Kaydet
            const paymentRef = doc(collection(db, "payments"));
            transaction.set(paymentRef, payment);

            // 🔥 2. Borçları Güncelle (Firebase Increment ile sıfır risk!)
            for (const saleId in debtReductions) {
                const debtRef = doc(db, "stores", payment.storeId, "debts", saleId);
                // Artık "Toplam ne kadardı, ne kadar kaldı" diye okumamıza gerek yok.
                // Sadece "Ödenen Tutara Şunu Ekle" diyoruz. Kalanı arayüz kendi hesaplayacak.
                transaction.set(debtRef, {
                    paidAmount: increment(debtReductions[saleId]),
                    lastPaymentDate: payment.date
                }, { merge: true });
            }

            // 3. Kasaları Güncelle
            const storeRef = doc(db, "stores", payment.storeId);
            const updates: any = {};
            for (const mId in balanceChanges) {
                if (balanceChanges[mId].TL !== 0) updates[`currentBalance.${mId}.TL`] = increment(balanceChanges[mId].TL);
                if (balanceChanges[mId].USD !== 0) updates[`currentBalance.${mId}.USD`] = increment(balanceChanges[mId].USD);
                if (balanceChanges[mId].EUR !== 0) updates[`currentBalance.${mId}.EUR`] = increment(balanceChanges[mId].EUR);
                if (balanceChanges[mId].GBP !== 0) updates[`currentBalance.${mId}.GBP`] = increment(balanceChanges[mId].GBP);
            }
            if (Object.keys(updates).length > 0) transaction.update(storeRef, updates);
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

export const getNextPaymentReceiptNo = async (storeId: string, transactionType: TransactionType): Promise<string> => {
    try {
        // Mağazaya ait ödemeleri oluşturulma tarihine göre tersten çek
        const q = query(
            collection(db, "payments"),
            where("storeId", "==", storeId),
            orderBy("createdAt", "desc"),
            limit(100) // Tipi bulma ihtimalini artırmak için limiti 100 yaptık
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return "1"; // Hiç kayıt yoksa 1'den başla
        }

        let typeMaxNumber = 0;
        let overallMaxNumber = 0;

        snapshot.docs.forEach(doc => {
            const data = doc.data() as PaymentDocument;
            const receiptNo = Number(data.receiptNo);

            if (!isNaN(receiptNo)) {
                // 1. Genel (Tüm tipler) içindeki en büyük numarayı bul
                if (receiptNo > overallMaxNumber) {
                    overallMaxNumber = receiptNo;
                }

                // 2. Sadece istenen TİP'e ait en büyük numarayı bul
                // (Fişin içindeki kalemlerden herhangi biri bu tipteyse o fişi bu tipe ait sayarız)
                const isMatchingType = data.items?.some(item => item.type === transactionType);
                if (isMatchingType && receiptNo > typeMaxNumber) {
                    typeMaxNumber = receiptNo;
                }
            }
        });

        // Eğer bu işleme (örneğin Merkez) ait daha önce bir fiş kesilmişse, onun en büyüğünden devam et (+1)
        if (typeMaxNumber > 0) {
            return (typeMaxNumber + 1).toString();
        }

        // Eğer bu işleme (örneğin Masraf) ait HİÇ fiş bulunamadıysa, Gelen fişlerin en büyüğünden devam et
        return (overallMaxNumber + 1).toString();

    } catch (error) {
        console.error("Makbuz no hatası:", error);
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

            const debtDifferences: Record<string, number> = {};
            oldPayment.items.forEach(i => { if (i.type === 'Tahsilat' && i.saleId) debtDifferences[i.saleId] = (debtDifferences[i.saleId] || 0) - Number(i.amount); });
            newPayment.items.forEach(i => { if (i.type === 'Tahsilat' && i.saleId) debtDifferences[i.saleId] = (debtDifferences[i.saleId] || 0) + Number(i.amount); });

            const balanceDiff: Record<string, { TL: number; USD: number; EUR: number; GBP: number }> = {};
            const initMethod = (mId: string) => { if (!balanceDiff[mId]) balanceDiff[mId] = { TL: 0, USD: 0, EUR: 0, GBP: 0 }; };

            oldPayment.items.forEach(i => {
                if (!i.paymentMethodId) return;
                initMethod(i.paymentMethodId);
                const amt = Number(i.originalAmount || i.amount);
                const cur = i.currency || 'TL';
                if (i.type === 'Tahsilat' || i.type === 'E/F') balanceDiff[i.paymentMethodId][cur] -= amt;
                else balanceDiff[i.paymentMethodId][cur] += amt;
            });

            newPayment.items.forEach(i => {
                if (!i.paymentMethodId) return;
                initMethod(i.paymentMethodId);
                const amt = Number(i.originalAmount || i.amount);
                const cur = i.currency || 'TL';
                if (i.type === 'Tahsilat' || i.type === 'E/F') balanceDiff[i.paymentMethodId][cur] += amt;
                else balanceDiff[i.paymentMethodId][cur] -= amt;
            });

            transaction.update(paymentRef, { ...newPayment, updatedAt: new Date() });

            // 🔥 SADECE FARKI INCREMENT İLE AKTAR
            for (const saleId in debtDifferences) {
                const diff = debtDifferences[saleId];
                if (diff !== 0) {
                    const debtRef = doc(db, "stores", newPayment.storeId, "debts", saleId);
                    transaction.set(debtRef, { paidAmount: increment(diff) }, { merge: true });
                }
            }

            const storeRef = doc(db, "stores", newPayment.storeId);
            const updates: any = {};
            for (const mId in balanceDiff) {
                if (balanceDiff[mId].TL !== 0) updates[`currentBalance.${mId}.TL`] = increment(balanceDiff[mId].TL);
                if (balanceDiff[mId].USD !== 0) updates[`currentBalance.${mId}.USD`] = increment(balanceDiff[mId].USD);
                if (balanceDiff[mId].EUR !== 0) updates[`currentBalance.${mId}.EUR`] = increment(balanceDiff[mId].EUR);
                if (balanceDiff[mId].GBP !== 0) updates[`currentBalance.${mId}.GBP`] = increment(balanceDiff[mId].GBP);
            }
            if (Object.keys(updates).length > 0) transaction.update(storeRef, updates);
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


// --- MERKEZ ONAY TİKLERİNİ TOPLU KAYDETME ---
export const saveBulkCenterTransferChecks = async (changes: { paymentId: string, itemIndex: number, isCenterChecked: boolean }[]) => {
    try {
        // Aynı paymentId'ye ait birden fazla değişiklik olabilir, o yüzden önce belgeleri gruplayıp okumamız lazım.
        // Güvenli olması için runTransaction kullanmak daha iyidir çünkü dizi içindeki (items) tek bir elemanı değiştiriyoruz.
        await runTransaction(db, async (transaction) => {
            const paymentDocs: Record<string, PaymentDocument> = {};
            const paymentRefs: Record<string, any> = {};

            // Değişen tüm ödeme belgelerini oku
            for (const change of changes) {
                if (!paymentDocs[change.paymentId]) {
                    const pRef = doc(db, "payments", change.paymentId);
                    const pSnap = await transaction.get(pRef);
                    if (pSnap.exists()) {
                        paymentDocs[change.paymentId] = pSnap.data() as PaymentDocument;
                        paymentRefs[change.paymentId] = pRef;
                    }
                }
            }

            // Hafızadaki belgeler üzerinde değişiklikleri uygula
            for (const change of changes) {
                if (paymentDocs[change.paymentId]) {
                    paymentDocs[change.paymentId].items[change.itemIndex].isCenterChecked = change.isCenterChecked;
                }
            }

            // Güncellenmiş belgeleri veritabanına yaz
            for (const paymentId in paymentDocs) {
                transaction.update(paymentRefs[paymentId], { items: paymentDocs[paymentId].items });
            }
        });

        return true;
    } catch (error) {
        console.error("Toplu onay güncellenirken hata:", error);
        throw error;
    }
};

export const getPaymentsBySaleId = async (storeId: string, saleId: string) => {
    try {
        const q = query(collection(db, "payments"), where("storeId", "==", storeId));
        const snapshot = await getDocs(q);

        const relatedPayments: any[] = [];

        snapshot.docs.forEach(doc => {
            const data = doc.data() as PaymentDocument;

            // Fişin içindeki kalemleri (items) kontrol et
            if (data.items) {
                data.items.forEach(item => {
                    // Eğer bu ödeme kalemi, aradığımız satışa aitse listeye ekle
                    if (item.saleId === saleId && item.type === 'Tahsilat') {
                        relatedPayments.push({
                            paymentId: doc.id,
                            date: data.date,
                            receiptNo: data.receiptNo,
                            personnelName: data.personnelName,
                            amount: item.amount,
                            currency: item.currency,
                            paymentMethodId: item.paymentMethodId,
                            description: item.description
                        });
                    }
                });
            }
        });

        // Tarihe göre yeniden eskiye sırala
        relatedPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return relatedPayments;
    } catch (error) {
        console.error("Ödeme geçmişi çekilirken hata:", error);
        return [];
    }
};