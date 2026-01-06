// src/services/productService.ts
import { db } from "../firebase";
import { doc, getDoc,collection, addDoc, getDocs, query, orderBy, where } from "firebase/firestore";
import type { Product } from "../types";

// Koleksiyon adını sabitleyelim, hata yapmayalım
const COLLECTION_NAME = "products";

export const addProduct = async (product: Product) => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...product,
            createdAt: new Date() // Tarihi sunucu zamanı olarak kaydedelim
        });
        return docRef.id;
    } catch (error) {
        console.error("Ürün eklenirken hata:", error);
        throw error;
    }
};

export const getProducts = async (): Promise<Product[]> => {
    try {
        // Ürünleri oluşturulma tarihine göre tersten sırala (en yeni en üstte)
        const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        // Gelen veriyi bizim Product tipimize dönüştür
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Product[];
    } catch (error) {
        console.error("Ürünler çekilirken hata:", error);
        throw error;
    }
};

export const getProductById = async (id: string): Promise<Product | null> => {
    try {
        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Product;
        } else {
            return null; // Ürün bulunamadı
        }
    } catch (error) {
        console.error("Ürün detay hatası:", error);
        throw error;
    }
};


export const getProductsByCategoryId = async (categoryId: string): Promise<Product[]> => {
    try {
        const q = query(
            collection(db, "products"), 
            where("categoryId", "==", categoryId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Product[];
    } catch (error) {
        console.error("Hata:", error);
        return [];
    }
};