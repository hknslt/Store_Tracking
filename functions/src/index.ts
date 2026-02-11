import { onDocumentDeleted } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { setGlobalOptions } from "firebase-functions/v2";

admin.initializeApp();

setGlobalOptions({ region: "europe-west1" });

export const deleteUserAuthAccount = onDocumentDeleted("personnel/{userId}", async (event) => {
    if (!event.params) return;

    const userId = event.params.userId;
    
    logger.info(`Veritabanından personel silindi: ${userId}. Auth kaydı siliniyor...`);

    try {
        await admin.auth().deleteUser(userId);
        logger.info(`BAŞARILI: ${userId} kullanıcısının Auth kaydı silindi.`);
    } catch (error) {
        logger.error(`HATA: ${userId} Auth kaydı silinemedi.`, error);
    }
});