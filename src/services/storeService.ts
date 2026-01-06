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
    setDoc
} from "firebase/firestore";
import type { Store, Personnel } from "../types";
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


export const createStaffUser = async (personnelData: Personnel, password: string) => {
    let secondaryApp;
    try {
        // 1. Mevcut Firebase ayarlarını al
        const config = getApp().options;

        // 2. Admin oturumunu kapatmamak için "İkincil" bir Firebase uygulaması başlat
        secondaryApp = initializeApp(config, "SecondaryApp");
        const secondaryAuth = getAuth(secondaryApp);

        // 3. Yeni kullanıcıyı bu ikincil uygulama üzerinden oluştur
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, personnelData.email!, password);
        const newUser = userCredential.user;

        // 4. Oluşan kullanıcının oturumunu hemen kapat (Garanti olsun)
        await signOut(secondaryAuth);

        // 5. Şimdi asıl veritabanımıza (Firestore) personel bilgisini kaydet
        // ÖNEMLİ: Auth ID'si (uid) ile Firestore ID'si aynı olsun diye setDoc kullanıyoruz
        await setDoc(doc(db, PERSONNEL_COLLECTION, newUser.uid), {
            ...personnelData,
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
export const getAllPersonnel = async (): Promise<Personnel[]> => {
    const snapshot = await getDocs(collection(db, PERSONNEL_COLLECTION));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Personnel[];
};

// Sadece Belirli Mağazanın Personelini Getir (Mağaza Admini için)
export const getPersonnelByStore = async (storeId: string): Promise<Personnel[]> => {
    const q = query(
        collection(db, PERSONNEL_COLLECTION),
        where("storeId", "==", storeId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Personnel[];
};

// Personel Durumu Güncelle (Aktif/Pasif Yapma veya İşten Çıkarma)
export const updatePersonnelStatus = async (id: string, isActive: boolean, endDate?: string) => {
    const ref = doc(db, PERSONNEL_COLLECTION, id);
    await updateDoc(ref, {
        isActive,
        endDate: endDate || null // Pasifse tarih girilir, aktifse tarih silinir
    });
};