// src/services/definitionService.ts
import { db } from "../firebase";
import { collection, addDoc, getDocs, query, orderBy ,where } from "firebase/firestore";
import type { Group ,Category,Color, Cushion, Dimension } from "../types";

const GROUP_COLLECTION = "groups";
const CATEGORY_COLLECTION = "categories";
const COLOR_COLLECTION = "colors";
const DIMENSION_COLLECTION = "dimensions";
const CUSHION_COLLECTION = "cushions";

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

export const addCategory = async (category: Category) => {
    try {
        await addDoc(collection(db, CATEGORY_COLLECTION), category);
    } catch (error) {
        console.error("Kategori eklenirken hata:", error);
        throw error;
    }
};

export const getCategories = async (): Promise<Category[]> => {
    try {
        // Kategori adına göre sıralı getir
        const q = query(collection(db, CATEGORY_COLLECTION), orderBy("categoryName", "asc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Category[];
    } catch (error) {
        console.error("Hata:", error);
        throw error;
    }
};

// Belirli bir Gruba ait Kategorileri Getir (Bunu Ürün Eklemede kullanacağız)
export const getCategoriesByGroupId = async (groupId: string): Promise<Category[]> => {
    try {
        const q = query(
            collection(db, CATEGORY_COLLECTION), 
            where("groupId", "==", groupId) 
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Category[];
    } catch (error) {
        console.error("Hata:", error);
        throw error;
    }
};

export const addColor = async (color: Color) => {
    try {
        await addDoc(collection(db, COLOR_COLLECTION), color);
    } catch (error) {
        console.error("Renk eklenirken hata:", error);
        throw error;
    }
};

export const getColors = async (): Promise<Color[]> => {
    try {
        // İsime göre alfabetik getir
        const q = query(collection(db, COLOR_COLLECTION), orderBy("colorName", "asc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Color[];
    } catch (error) {
        console.error("Renkler çekilirken hata:", error);
        throw error;
    }
};

export const addDimension = async (dimension: Dimension) => {
    await addDoc(collection(db, DIMENSION_COLLECTION), dimension);
};

export const getDimensions = async (): Promise<Dimension[]> => {
    const q = query(collection(db, DIMENSION_COLLECTION), orderBy("dimensionName", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Dimension[];
};

export const addCushion = async (cushion: Cushion) => {
    await addDoc(collection(db, CUSHION_COLLECTION), cushion);
};

export const getCushions = async (): Promise<Cushion[]> => {
    const q = query(collection(db, CUSHION_COLLECTION), orderBy("cushionName", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Cushion[];
};