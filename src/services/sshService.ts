// src/services/sshService.ts
import { db } from "../firebase";
import { collection, addDoc, getDocs, query, where, orderBy } from "firebase/firestore";
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