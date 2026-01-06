// src/services/storeStockService.ts
import { db } from "../firebase";
import {
    collection,
    getDocs,
    doc,
    setDoc
} from "firebase/firestore";

// MAĞAZA İÇİNDEKİ ÜRÜNLERİ GETİR
// Yol: stores/{storeId}/products
export const getStoreProducts = async (storeId: string) => {
    try {
        // Mağazanın içindeki 'products' koleksiyonuna gidiyoruz
        const subCollectionRef = collection(db, "stores", storeId, "products");
        const snapshot = await getDocs(subCollectionRef);

        // Bize dönen veri: [{id: "urun_1", stock: 50}, ...]
        return snapshot.docs.map(doc => ({
            id: doc.id,       // Ürün ID'si
            stock: doc.data().stock || 0
        }));
    } catch (error) {
        console.error("Mağaza ürünleri çekilirken hata:", error);
        return [];
    }
};

// MAĞAZA STOĞUNU KAYDET
// Yol: stores/{storeId}/products/{productId}
export const saveStoreProductStock = async (storeId: string, productId: string, stock: number) => {
    try {
        // Direkt ID üzerinden işlem yapıyoruz
        const ref = doc(db, "stores", storeId, "products", productId);

        // setDoc ile yazıyoruz. Varsa günceller, yoksa oluşturur.
        await setDoc(ref, {
            stock: Number(stock)
        }, { merge: true });

    } catch (error) {
        console.error("Stok kayıt hatası:", error);
        throw error;
    }
};