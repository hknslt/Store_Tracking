// src/services/productService.ts
import { db } from "../firebase";
import {
    collection,
    getDocs,
    query,
    orderBy,
    where,
    doc,
    getDoc,
    writeBatch // <-- Toplu işlem için bunu ekledik
} from "firebase/firestore";
import type { Product } from "../types";

const COLLECTION_NAME = "products";

// YENİ: Çoklu Renk ile Ürün Ekleme (Batch İşlemi)
export const addProductBatch = async (
    // 'id' ve 'createdAt' alanlarını da hariç tutuyoruz (Omit)
    baseData: Omit<Product, 'colorId' | 'id' | 'createdAt'>,
    colorIds: string[]
) => {
    try {
        const batch = writeBatch(db);

        colorIds.forEach(colorId => {
            const newDocRef = doc(collection(db, COLLECTION_NAME));

            const productData: Product = {
                ...baseData,
                colorId: colorId,
                createdAt: new Date() // Tarihi burada biz veriyoruz
            };

            batch.set(newDocRef, productData);
        });

        await batch.commit();

    } catch (error) {
        console.error("Toplu ürün ekleme hatası:", error);
        throw error;
    }
};

// ... Diğer getProducts, getProductById, getProductsByCategoryId fonksiyonları AYNI kalacak ...
// (Sadece getProducts içinde Cushion ile ilgili bir işlem yapıyorsan onu silmen yeterli)

export const getProducts = async (): Promise<Product[]> => {
    try {
        const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Product[];
    } catch (error) {
        console.error("Hata:", error);
        throw error;
    }
};

export const getProductById = async (id: string): Promise<Product | null> => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Product;
        } else {
            return null;
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
};

export const getProductsByCategoryId = async (categoryId: string): Promise<Product[]> => {
    try {
        const q = query(collection(db, COLLECTION_NAME), where("categoryId", "==", categoryId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
    } catch (error) {
        console.error(error);
        return [];
    }
};