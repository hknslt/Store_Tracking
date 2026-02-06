// src/services/sshService.ts
import { db } from "../firebase";
import { collection, addDoc, getDocs, query, where, orderBy, updateDoc, deleteDoc, doc, getDoc } from "firebase/firestore";
import type { SSHRecord } from "../types";

const COLLECTION_NAME = "ssh_records";

// Yeni SSH Kaydı Ekle
export const addSSHRecord = async (record: SSHRecord) => {
    try {
        await addDoc(collection(db, COLLECTION_NAME), record);
    } catch (error) {
        console.error("SSH kayıt hatası:", error);
        throw error;
    }
};

// Mağazaya Göre SSH Listesi Getir
export const getSSHRecordsByStore = async (storeId: string) => {
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("storeId", "==", storeId),
            orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SSHRecord[];
    } catch (error) {
        console.error("SSH listeleme hatası:", error);
        return [];
    }
};

export const getSSHRecordById = async (id: string): Promise<SSHRecord | null> => {
    const docRef = doc(db, "ssh_records", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as SSHRecord;
    }
    return null;
};

// 2. Kayıt Güncelle (Düzenleme İçin)
export const updateSSHRecord = async (id: string, data: Partial<SSHRecord>) => {
    const docRef = doc(db, "ssh_records", id);
    await updateDoc(docRef, data);
};

// 3. Kayıt Sil
export const deleteSSHRecord = async (id: string) => {
    const docRef = doc(db, "ssh_records", id);
    await deleteDoc(docRef);
};

// 4. Durum Güncelle (Tamamlandı/Yapıldı İşlemi)
export const updateSSHStatus = async (id: string, status: 'Açık' | 'Kapalı') => {
    const docRef = doc(db, "ssh_records", id);
    await updateDoc(docRef, { status });
};