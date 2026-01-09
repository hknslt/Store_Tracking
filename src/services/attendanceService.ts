// src/services/attendanceService.ts
import { db } from "../firebase";
import { collection, doc, getDocs, query, setDoc, where } from "firebase/firestore";
import type { Attendance, AttendanceType } from "../types";

// Belirli bir mağaza ve tarih için puantaj listesini getir
export const getAttendanceByDate = async (storeId: string, date: string) => {
    try {
        const q = query(
            collection(db, "attendance"),
            where("storeId", "==", storeId),
            where("date", "==", date)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as Attendance);
    } catch (error) {
        console.error("Puantaj çekme hatası:", error);
        return [];
    }
};

// Puantaj Kaydet / Güncelle
export const saveAttendance = async (
    storeId: string,
    personnelId: string,
    personnelName: string,
    date: string,
    type: AttendanceType,
    note: string = ""
) => {
    try {
        // Özel ID: Çakışmayı önler, aynı gün için sadece güncelleme yapar
        const docId = `att_${personnelId}_${date}`;
        const ref = doc(db, "attendance", docId);

        const data: Attendance = {
            storeId,
            personnelId,
            personnelName,
            date,
            type,
            note
        };

        // merge: true ile varsa günceller, yoksa oluşturur
        await setDoc(ref, data, { merge: true });
    } catch (error) {
        console.error("Puantaj kayıt hatası:", error);
        throw error;
    }
};