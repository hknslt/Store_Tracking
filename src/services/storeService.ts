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
    deleteDoc
} from "firebase/firestore";
import type { Store, Personnel, SystemUser } from "../types";
import { createUserWithEmailAndPassword, getAuth, signOut } from "firebase/auth";
import { deleteApp, getApp, initializeApp } from "firebase/app";

const STORE_COLLECTION = "stores";
const PERSONNEL_COLLECTION = "personnel";

// --- MAĞAZA İŞLEMLERİ ---

export const addStore = async (store: Store) => {
    await addDoc(collection(db, STORE_COLLECTION), store);
};

export const getStores = async (): Promise<Store[]> => {
    const q = query(collection(db, STORE_COLLECTION), orderBy("storeName", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Store[];
};

// --- PERSONEL İŞLEMLERİ ---


export const createStaffUser = async (SystemUserData: SystemUser, password: string) => {
    let secondaryApp;
    try {
        // 1. Mevcut Firebase ayarlarını al
        const config = getApp().options;

        // 2. Admin oturumunu kapatmamak için "İkincil" bir Firebase uygulaması başlat
        secondaryApp = initializeApp(config, "SecondaryApp");
        const secondaryAuth = getAuth(secondaryApp);

        // 3. Yeni kullanıcıyı bu ikincil uygulama üzerinden oluştur
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, SystemUserData.email!, password);
        const newUser = userCredential.user;

        // 4. Oluşan kullanıcının oturumunu hemen kapat (Garanti olsun)
        await signOut(secondaryAuth);

        // 5. Şimdi asıl veritabanımıza (Firestore) personel bilgisini kaydet
        // ÖNEMLİ: Auth ID'si (uid) ile Firestore ID'si aynı olsun diye setDoc kullanıyoruz
        await setDoc(doc(db, PERSONNEL_COLLECTION, newUser.uid), {
            ...SystemUserData,
            id: newUser.uid // ID'yi de içine yazalım
        });

    } catch (error) {
        console.error("Personel oluşturma hatası:", error);
        throw error;
    } finally {
        // 6. İkincil uygulamayı temizle (Hafızada yer kaplamasın)
        if (secondaryApp) {
            await deleteApp(secondaryApp);
        }
    }
};


export const addPersonnel = async (personnel: Personnel) => {
    await addDoc(collection(db, PERSONNEL_COLLECTION), personnel);
};

// Tüm Personelleri Getir (Süper Admin için)
export const getAllPersonnel = async (): Promise<(Personnel | SystemUser)[]> => {
    try {
        // Hem 'staff' hem de 'store_admin' olanları getir
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

// Sadece Belirli Mağazanın Personelini Getir (Mağaza Admini için)
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

// Personel Durumu Güncelle (Aktif/Pasif Yapma veya İşten Çıkarma)
export const updatePersonnelStatus = async (id: string, isActive: boolean, endDate?: string) => {
    const ref = doc(db, PERSONNEL_COLLECTION, id);
    await updateDoc(ref, {
        isActive,
        endDate: endDate || null // Pasifse tarih girilir, aktifse tarih silinir
    });
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

// Mağaza Sil
export const deleteStore = async (id: string) => {
    const ref = doc(db, "stores", id);
    await deleteDoc(ref);
};

export const updatePersonnel = async (id: string, data: any) => {
    const ref = doc(db, "personnel", id);
    await updateDoc(ref, data);
};

// Personel Silme (Tamamen yok etme)
export const deletePersonnel = async (id: string) => {
    const ref = doc(db, "personnel", id);
    await deleteDoc(ref);
};