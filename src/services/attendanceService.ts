// src/services/attendanceService.ts
import { db } from "../firebase";
import { doc, getDoc, setDoc, writeBatch } from "firebase/firestore";
import type { AttendanceType, MonthlyAttendance } from "../types";

// Mağaza ve Ay bazında tüm puantajı getir (TEK BİR OKUMA İLE)
export const getMonthlyAttendance = async (storeId: string, year: number, month: number): Promise<MonthlyAttendance | null> => {
    try {
        const docId = `${year}_${String(month).padStart(2, '0')}`;
        // Yol: stores -> STORE_ID -> attendances -> YYYY_MM
        const ref = doc(db, "stores", storeId, "attendances", docId);
        
        const snap = await getDoc(ref);
        
        if (snap.exists()) {
            return { id: snap.id, ...snap.data() } as MonthlyAttendance;
        }
        return null;
    } catch (error) {
        console.error("Puantaj çekme hatası:", error);
        return null;
    }
};

// Tek bir günün durumunu kaydet (Merge ile)
export const saveDailyAttendance = async (
    storeId: string,
    personnelId: string,
    day: number,
    year: number,
    month: number,
    type: AttendanceType | null // Null gelirse siler
) => {
    try {
        const docId = `${year}_${String(month).padStart(2, '0')}`;
        const ref = doc(db, "stores", storeId, "attendances", docId);
        
        // Map anahtarı: "PERSONELID_GUN" (Örn: "p123_05")
        // Gün tek haneli ise başına 0 koyalım (Sıralama düzgün olsun diye)
        const dayKey = `${personnelId}_${String(day).padStart(2, '0')}`;

        // Eğer type null ise silmek için FieldValue.delete() kullanabiliriz ama
        // basitlik için undefined ataması veya null bırakma yapabiliriz.
        // Firestore update notasyonunda "records.KEY" şeklinde güncelleme yapacağız.
        
        // Ancak setDoc({ records: { key: value } }, { merge: true }) daha pratik.
        
        const updateData = {
            storeId, // Belge yoksa oluşurken lazım olur
            month: `${year}-${String(month).padStart(2, '0')}`,
            records: {
                [dayKey]: type // Dinamik anahtar
            }
        };

        // Eğer type null ise, kaydı siliyoruz demektir.
        // setDoc merge ile null değeri üzerine yazar, pratiktir.
        
        await setDoc(ref, updateData, { merge: true });

    } catch (error) {
        console.error("Puantaj kayıt hatası:", error);
        throw error;
    }
};

export const saveBulkAttendance = async (
    storeId: string,
    year: number,
    month: number,
    fullRecords: Record<string, AttendanceType> // Tüm güncel tablo verisi
) => {
    try {
        const batch = writeBatch(db);
        const docId = `${year}_${String(month).padStart(2, '0')}`;
        const ref = doc(db, "stores", storeId, "attendances", docId);

        // Firestore'da map içindeki null değerleri temizlemek zordur.
        // Bu yüzden tüm "records" objesini yeniden yazmak (merge: true ile değil, o alanın üzerine yazmak) 
        // veya temizlenmiş objeyi göndermek en mantıklısıdır.
        
        // Boş (null/undefined) olanları temizle
        const cleanRecords: Record<string, string> = {};
        
        Object.entries(fullRecords).forEach(([key, value]) => {
            if (value) {
                cleanRecords[key] = value;
            }
        });

        // Belgeyi güncelle (veya yoksa oluştur)
        // SetDoc kullanarak 'records' alanını tamamen yeniliyoruz. 
        // Merge: true kullanıyoruz ki storeId, month gibi diğer alanlar silinmesin.
        batch.set(ref, {
            storeId,
            month: `${year}-${String(month).padStart(2, '0')}`,
            records: cleanRecords
        }, { merge: true });

        await batch.commit();

    } catch (error) {
        console.error("Toplu kayıt hatası:", error);
        throw error;
    }
};