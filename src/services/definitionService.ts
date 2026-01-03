// src/services/definitionService.ts
import { db } from "../firebase";
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import type { Group } from "../types";

const GROUP_COLLECTION = "groups";

export const addGroup = async (group: Group) => {
    try {
        await addDoc(collection(db, GROUP_COLLECTION), group);
    } catch (error) {
        console.error("Hata:", error);
        throw error;
    }
};

export const getGroups = async (): Promise<Group[]> => {
    try {
        // ARTIK İSME GÖRE SIRALIYORUZ
        const q = query(collection(db, GROUP_COLLECTION), orderBy("groupName", "asc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Group[];
    } catch (error) {
        console.error("Hata:", error);
        throw error;
    }
};