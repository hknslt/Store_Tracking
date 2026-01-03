// src/services/productService.ts
import { db } from "../firebase";
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
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