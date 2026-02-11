// src/services/storeService.ts
import { db } from "../firebase";
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    doc,
    updateDoc,
    orderBy,
    setDoc,
    getDoc,
    deleteDoc,
    writeBatch
} from "firebase/firestore";
import type { Store, Personnel, SystemUser } from "../types";
import { createUserWithEmailAndPassword, getAuth, signOut } from "firebase/auth";
import { deleteApp, getApp, initializeApp } from "firebase/app";

const STORE_COLLECTION = "stores";
const PERSONNEL_COLLECTION = "personnel";
const SSH_COLLECTION = "ssh_records"; // 🔥 SSH Koleksiyonu

// --- YARDIMCI FONKSİYON: Toplu Silme (Alt Koleksiyonlar İçin) ---
const deleteCollection = async (path: string) => {
    const q = query(collection(db, path));
    const snapshot = await getDocs(q);

    // Batch işlemi (Tek seferde 500 işleme kadar izin verir)
    const batch = writeBatch(db);
    let count = 0;

    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        count++;
    });

    if (count > 0) {
        await batch.commit();
        console.log(`${path} yolundan ${count} kayıt silindi.`);
    }
};

// --- MAĞAZA İŞLEMLERİ ---

export const addStore = async (store: Store) => {
    await addDoc(collection(db, STORE_COLLECTION), store);
};

export const getStores = async (): Promise<Store[]> => {
    const q = query(collection(db, STORE_COLLECTION), orderBy("storeName", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Store[];
};

export const getStoreById = async (storeId: string): Promise<Store | null> => {
    try {
        const docRef = doc(db, "stores", storeId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Store;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Mağaza detay hatası:", error);
        return null;
    }
};

export const updateStore = async (id: string, data: any) => {
    const ref = doc(db, "stores", id);
    await updateDoc(ref, data);
};

// 🔥 GÜNCELLENMİŞ SİLME FONKSİYONU (SSH Dahil)
export const deleteStore = async (storeId: string) => {
    try {
        console.log(`Mağaza siliniyor: ${storeId}...`);
        const batch = writeBatch(db);

        // 1. PERSONELLERİ SİL
        const personnelQuery = query(collection(db, PERSONNEL_COLLECTION), where("storeId", "==", storeId));
        const personnelSnap = await getDocs(personnelQuery);
        personnelSnap.forEach((doc) => {
            batch.delete(doc.ref);
        });

        // 2. SSH KAYITLARINI SİL (🔥 YENİ EKLENDİ)
        const sshQuery = query(collection(db, SSH_COLLECTION), where("storeId", "==", storeId));
        const sshSnap = await getDocs(sshQuery);
        sshSnap.forEach((doc) => {
            batch.delete(doc.ref);
        });

        // Batch'i uygula (Personel ve SSH silinir)
        await batch.commit();
        console.log("Personeller ve SSH kayıtları silindi.");

        // 3. SATIŞLARI SİL (Sales)
        await deleteCollection(`sales/${storeId}/receipts`);
        await deleteDoc(doc(db, "sales", storeId));

        // 4. ALIŞLARI SİL (Purchases)
        await deleteCollection(`purchases/${storeId}/receipts`);
        await deleteDoc(doc(db, "purchases", storeId));

        // 5. MAĞAZA ALT VERİLERİNİ SİL (Stocks, Debts, Requests)
        await deleteCollection(`stores/${storeId}/stocks`);
        await deleteCollection(`stores/${storeId}/debts`);
        await deleteCollection(`stores/${storeId}/pending_requests`);

        // 6. MAĞAZANIN KENDİSİNİ SİL
        const storeRef = doc(db, STORE_COLLECTION, storeId);
        await deleteDoc(storeRef);

        console.log("Mağaza ve tüm verileri başarıyla silindi.");
    } catch (error) {
        console.error("Mağaza silme hatası:", error);
        throw error;
    }
};

// --- PERSONEL İŞLEMLERİ ---

export const createStaffUser = async (SystemUserData: SystemUser, password: string) => {
    let secondaryApp;
    try {
        const config = getApp().options;
        secondaryApp = initializeApp(config, "SecondaryApp");
        const secondaryAuth = getAuth(secondaryApp);

        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, SystemUserData.email!, password);
        const newUser = userCredential.user;

        await signOut(secondaryAuth);

        await setDoc(doc(db, PERSONNEL_COLLECTION, newUser.uid), {
            ...SystemUserData,
            id: newUser.uid
        });

    } catch (error) {
        console.error("Personel oluşturma hatası:", error);
        throw error;
    } finally {
        if (secondaryApp) {
            await deleteApp(secondaryApp);
        }
    }
};

export const addPersonnel = async (personnel: Personnel) => {
    await addDoc(collection(db, PERSONNEL_COLLECTION), personnel);
};

export const getAllPersonnel = async (): Promise<(Personnel | SystemUser)[]> => {
    try {
        const q = query(
            collection(db, "personnel"),
            where("role", "in", ["staff", "store_admin"])
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (Personnel | SystemUser)[];
    } catch (error) {
        console.error("Personel çekme hatası:", error);
        return [];
    }
};

export const getPersonnelByStore = async (storeId: string): Promise<Personnel[]> => {
    try {
        const q = query(
            collection(db, "personnel"),
            where("storeId", "==", storeId),
            where("role", "in", ["staff", "store_admin"])
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Personnel[];
    } catch (error) {
        console.error(error);
        return [];
    }
};

export const updatePersonnelStatus = async (id: string, isActive: boolean, endDate?: string) => {
    const ref = doc(db, PERSONNEL_COLLECTION, id);
    await updateDoc(ref, {
        isActive,
        endDate: endDate || null
    });
};

export const updatePersonnel = async (id: string, data: any) => {
    const ref = doc(db, "personnel", id);
    await updateDoc(ref, data);
};

export const deletePersonnel = async (id: string) => {
    try {
        console.log(`Personel veritabanından siliniyor: ${id}`);

        // Firestore Verisini Sil
        const ref = doc(db, "personnel", id);
        await deleteDoc(ref);

        console.log("Personel silme işlemi başlatıldı.");
    } catch (error) {
        console.error("Silme hatası:", error);
        throw error;
    }
};
export const getAllSystemUsers = async (): Promise<(Personnel | SystemUser)[]> => {
    try {
        const q = query(collection(db, "personnel"), orderBy("fullName", "asc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (Personnel | SystemUser)[];
    } catch (error) {
        console.error("Kullanıcılar çekilemedi:", error);
        return [];
    }
};

export const getUserById = async (id: string): Promise<SystemUser | null> => {
    const docRef = doc(db, "personnel", id);
    const snap = await getDoc(docRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } as SystemUser : null;
};