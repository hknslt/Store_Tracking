import { db } from "../firebase";
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, getDoc, arrayRemove, deleteDoc } from "firebase/firestore";
import type { DeviceRequest } from "../types";

// Bekleyen Cihaz İsteklerini Getir
export const getPendingDeviceRequests = async (): Promise<DeviceRequest[]> => {
    try {
        const q = query(collection(db, "device_requests"), where("status", "==", "pending"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DeviceRequest[];
    } catch (error) {
        console.error("Cihaz istekleri çekilemedi:", error);
        return [];
    }
};

// Cihazı Onayla
export const approveDevice = async (requestId: string, personnelId: string, deviceId: string, deviceName: string) => {
    try {
        const requestRef = doc(db, "device_requests", requestId);
        await updateDoc(requestRef, { status: 'approved', updatedAt: new Date().toISOString() });

        const userRef = doc(db, "users", personnelId);
        const userSnap = await getDoc(userRef);

        // allowedDevices dizisine ID eklerken, deviceNames objesine de ID: İsim olarak kayıt atıyoruz
        const updateData = {
            allowedDevices: arrayUnion(deviceId),
            [`deviceNames.${deviceId}`]: deviceName
        };

        if (userSnap.exists()) {
            await updateDoc(userRef, updateData);
        } else {
            await updateDoc(doc(db, "personnel", personnelId), updateData);
        }
    } catch (error) {
        console.error("Cihaz onaylama hatası:", error);
        throw error;
    }
};

export const addDeviceManually = async (personnelId: string, deviceId: string, deviceName: string) => {
    try {
        const userRef = doc(db, "users", personnelId);
        const userSnap = await getDoc(userRef);

        const updateData = {
            allowedDevices: arrayUnion(deviceId),
            [`deviceNames.${deviceId}`]: deviceName
        };

        if (userSnap.exists()) {
            await updateDoc(userRef, updateData);
        } else {
            await updateDoc(doc(db, "personnel", personnelId), updateData);
        }
    } catch (error) {
        console.error("Manuel cihaz ekleme hatası:", error);
        throw error;
    }
};

export const getAllPersonnelForDevice = async () => {
    try {
        const usersSnap = await getDocs(collection(db, "users"));
        let allUsers = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

        const personnelSnap = await getDocs(collection(db, "personnel"));
        const personnelUsers = personnelSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

        allUsers = [...allUsers, ...personnelUsers];
        return Array.from(new Map(allUsers.map(item => [item.id, item])).values());
    } catch (error) {
        return [];
    }
};

// Cihazı Reddet
export const rejectDevice = async (requestId: string) => {
    try {
        const requestRef = doc(db, "device_requests", requestId);
        await updateDoc(requestRef, { status: 'rejected', updatedAt: new Date().toISOString() });
    } catch (error) {
        console.error("Cihaz reddetme hatası:", error);
        throw error;
    }
};

export const getUsersWithDevices = async () => {
    try {
        // Önce users tablosundan çek (yeni yapı)
        const usersSnap = await getDocs(collection(db, "users"));
        let allUsers = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

        // Eski personnel tablosunu da kontrol et (Geriye dönük uyumluluk)
        const personnelSnap = await getDocs(collection(db, "personnel"));
        const personnelUsers = personnelSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

        // İkisini birleştir ve sadece 'allowedDevices' dizisi dolu olanları filtrele
        allUsers = [...allUsers, ...personnelUsers];

        // Aynı ID'ye sahip olanları tekilleştir
        const uniqueUsers = Array.from(new Map(allUsers.map(item => [item.id, item])).values());

        return uniqueUsers.filter(u => u.allowedDevices && u.allowedDevices.length > 0);
    } catch (error) {
        console.error("Kayıtlı cihazları getirme hatası:", error);
        return [];
    }
};

// Bir Cihazın Erişim İznini Kaldır
export const revokeDeviceAccess = async (userId: string, deviceId: string) => {
    try {
        // 1. Kullanıcının allowedDevices dizisinden cihazı çıkar
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            await updateDoc(userRef, { allowedDevices: arrayRemove(deviceId) });
        } else {
            const personnelRef = doc(db, "personnel", userId);
            await updateDoc(personnelRef, { allowedDevices: arrayRemove(deviceId) });
        }

        // 2. Bu cihaza ait eski "device_requests" kayıtlarını tamamen sil (İstek tekrar düşebilsin diye)
        const reqQuery = query(
            collection(db, "device_requests"),
            where("personnelId", "==", userId),
            where("deviceId", "==", deviceId)
        );

        const reqSnap = await getDocs(reqQuery);

        // Bulunan eski isteklerin hepsini sil
        const deletePromises = reqSnap.docs.map(requestDoc => deleteDoc(requestDoc.ref));
        await Promise.all(deletePromises);

    } catch (error) {
        console.error("Cihaz izni kaldırma hatası:", error);
        throw error;
    }
};