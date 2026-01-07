// src/services/productService.ts
import { db } from "../firebase";
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    doc,     // <-- EKLENDİ
    getDoc   // <-- EKLENDİ
} from "firebase/firestore";
import type { Product } from "../types";

const COLLECTION_NAME = "products";

export const addProduct = async (product: Product) => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...product,
            createdAt: new Date()
        });
        return docRef.id;
    } catch (error) {
        console.error("Hata:", error);
        throw error;
    }
};

// orderBy kaldırıldı (Index hatasını önlemek için)
export const getProductsByCategoryId = async (categoryId: string): Promise<Product[]> => {
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("categoryId", "==", categoryId)
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Product[];

        // JavaScript tarafında sıralama
        return list.sort((a, b) => a.productName.localeCompare(b.productName));
    } catch (error) {
        console.error("Ürün çekme hatası:", error);
        return [];
    }
};

export const getProducts = async (): Promise<Product[]> => {
    try {
        const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
    } catch (error) {
        console.error(error);
        return [];
    }
};

// 👇 EKSİK OLAN FONKSİYON BURAYA EKLENDİ 👇
export const getProductById = async (id: string): Promise<Product | null> => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Product;
        } else {
            console.log("Ürün bulunamadı!");
            return null;
        }
    } catch (error) {
        console.error("Tekil ürün çekme hatası:", error);
        throw error;
    }
};