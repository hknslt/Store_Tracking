// src/services/priceService.ts
import { db } from "../firebase";
import { collection, getDocs, doc, setDoc, getDoc, addDoc, deleteDoc } from "firebase/firestore";

const PRICE_LISTS_COLLECTION = "price_lists";

export interface PriceListModel {
    id?: string;
    name: string;
    type: 'perakende' | 'toptan';
    storeIds: string[]; // Bu listeyi kullanan mağazaların ID'leri
    prices: Record<string, number>; // Örn: { "prodId_std": 100, "prodId_dimId": 120 }
    createdAt?: string;
}

// Tüm Fiyat Listelerini Getir
export const getPriceLists = async (): Promise<PriceListModel[]> => {
    try {
        const snapshot = await getDocs(collection(db, PRICE_LISTS_COLLECTION));
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as PriceListModel[];
    } catch (error) {
        console.error("Fiyat listeleri çekme hatası:", error);
        return [];
    }
};

// Tek Bir Fiyat Listesini Getir (Düzenleme için)
export const getPriceListById = async (id: string): Promise<PriceListModel | null> => {
    try {
        const docRef = doc(db, PRICE_LISTS_COLLECTION, id);
        const snapshot = await getDoc(docRef);
        return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as PriceListModel : null;
    } catch (error) {
        console.error("Fiyat listesi detay hatası:", error);
        return null;
    }
};

// Fiyat Listesi Oluştur veya Güncelle
export const savePriceList = async (data: PriceListModel, id?: string): Promise<string> => {
    try {
        if (id) {
            // Güncelleme
            const docRef = doc(db, PRICE_LISTS_COLLECTION, id);
            await setDoc(docRef, data, { merge: true });
            return id;
        } else {
            // Yeni Ekleme
            const docRef = await addDoc(collection(db, PRICE_LISTS_COLLECTION), {
                ...data,
                createdAt: new Date().toISOString()
            });
            return docRef.id; //   Oluşturulan yeni ID'yi döndür
        }
    } catch (error) {
        console.error("Fiyat listesi kaydetme hatası:", error);
        throw error;
    }
};

// Fiyat Listesi Sil
export const deletePriceList = async (id: string) => {
    try {
        await deleteDoc(doc(db, PRICE_LISTS_COLLECTION, id));
    } catch (error) {
        console.error("Fiyat listesi silme hatası:", error);
        throw error;
    }
};