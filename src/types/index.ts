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
    id?: string;      
    groupName: string; 
}

export interface Category {
    id?: string;
    groupId: string;      
    categoryName: string; 
}

export interface Color {
    id?: string;
    colorName: string; 
}

export interface Dimension {
    id?: string;
    dimensionName: string; 
}

export interface Cushion {
    id?: string;
    cushionName: string;  
}

export interface Price {
    id?: string;
    productId: string; 
    amount: number;    
}

export interface Stock {
    id?: string;
    productId: string; 
    quantity: number;  
}

//-----------Modules----------------

export interface Purchase {
    id?: string;
    date: string;          // Tarih (2024-05-20 gibi)
    personnel: string;     // Personel Adı
    receiptNo: string;     // Fiş No
    
    // Ürün Hiyerarşisi
    groupId: string;       
    categoryId: string;
    productId: string;     // Seçilen Ürün ID'si
    
    // Özellikler
    colorId: string;
    cushionId: string;
    dimensionId: string; // Veritabanında ID tutmak en sağlıklısıdır
    
    explanation?: string;
    quantity: number;      // Adet
    amount: number;        // Tutar (Toplam)
    status: 'Alış' | 'İade'; // Durum
}




// 1. MAĞAZA TİPİ
export interface Store {
    id?: string;
    storeName: string;
    storeCode: string; // Örn: M-001 (Şube Kodu)
    address?: string;
    phone?: string;
}

// 2. PERSONEL TİPİ
export interface Personnel {
    id?: string;
    storeId: string;       // Hangi mağazaya bağlı?
    
    fullName: string;      // Adı Soyadı
    isActive: boolean;     // Aktif - Pasif
    role: 'admin' | 'store_admin' | 'staff'; // Kullanıcı Tipi
    
    startDate: string;     // İşe Başlama (YYYY-MM-DD)
    endDate?: string;      // İşten Ayrılma (Boş olabilir)
    
    phone: string;
    address?: string;
    
    email?: string;        // Giriş yaparken lazım olabilir (Opsiyonel şimdilik)
}


//MAĞAZA STOK TİPİ
export interface StoreProduct {
    id: string;    // Ürün ID'si (Döküman ID'si ile aynı)
    stock: number; // Stok Adedi
}