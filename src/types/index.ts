// src/types/index.ts

export interface Product {
    id?: string; // Firebase otomatik verecek
    groupId: string; // Zorunlu (İlişkisel ID)
    categoryId: string; // Zorunlu (İlişkisel ID)
    productName: string; // Zorunlu
    colorId: string; // Zorunlu
    dimension?: string; // Opsiyonel
    cushionId: string; // Zorunlu (Minder/Yastık bilgisi)
    explanation?: string; // Opsiyonel
    createdAt: Date;
}


export interface Group {
    id?: string;       // Firebase ID'si (Otomatik)
    groupName: string; // Grup Adı (Örn: "Oturma Grubu")
}