// src/services/trackingService.ts
import { db } from "../firebase";
import { collectionGroup, getDocs, query, orderBy, where } from "firebase/firestore";
import type { Sale, Debt } from "../types";

export interface TrackingRow {
    sale: Sale;
    debt?: Debt;
}

// Tüm mağazaların verilerini çeker, JS tarafında filtreler (Hata almamak için)
export const getInvoiceTrackingData = async (startDate: string, endDate: string, storeId?: string) => {
    try {
        // 1. SATIŞLARI ÇEK (Collection Group ile tüm mağazalar)
        //   ÖNEMLİ: Burada "type" filtresini kaldırdık. 
        // İndeks hatası almamak için tüm fişleri çekip aşağıda JS ile eleyeceğiz.

        let salesQuery = query(
            collectionGroup(db, "receipts"),
            where("date", ">=", startDate),
            where("date", "<=", endDate),
            orderBy("date", "desc")
        );

        // Eğer mağaza seçildiyse (Opsiyonel: yine de ana filtrelemeyi JS'de yapacağız)
        if (storeId) {
            salesQuery = query(
                collectionGroup(db, "receipts"),
                where("storeId", "==", storeId),
                where("date", ">=", startDate),
                where("date", "<=", endDate),
                orderBy("date", "desc")
            );
        }

        const salesSnap = await getDocs(salesQuery);

        //   JS FİLTRESİ: Burada "Satış" olanları VEYA tipi olmayanları (eski kayıtlar) alıyoruz.
        // "Alış" (Stok Giriş) olanları eliyoruz.
        const sales = salesSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as any))
            .filter(item => {
                // Tipi 'Satış' olanlar YA DA tipi hiç yazılmamış (eski) kayıtlar gelsin.
                // Tipi 'Alış' olanlar gelmesin.
                return item.type === 'Satış' || !item.type;
            }) as Sale[];

        // 2. BORÇLARI ÇEK
        let debtsQuery = query(collectionGroup(db, "debts"));

        if (storeId) {
            debtsQuery = query(collectionGroup(db, "debts"), where("storeId", "==", storeId));
        }

        const debtsSnap = await getDocs(debtsQuery);
        const debts = debtsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Debt[];

        // 3. VERİLERİ BİRLEŞTİR
        const combinedData: TrackingRow[] = sales.map(sale => {
            const foundDebt = debts.find(d => d.saleId === sale.id);
            return {
                sale,
                debt: foundDebt
            };
        });

        return combinedData;

    } catch (error) {
        console.error("Takip verisi çekme hatası:", error);
        return [];
    }
};