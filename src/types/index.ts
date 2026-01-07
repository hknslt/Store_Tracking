// src/types/index.ts

export interface Product {
    id?: string; // Firebase otomatik verecek
    groupId: string; // Zorunlu (İlişkisel ID)
    categoryId: string; // Zorunlu (İlişkisel ID)
    productName: string; // Zorunlu
    colorId: string; // Zorunlu
    dimensionId?: string | null; // Opsiyonel
    //cushionId: string; // Zorunlu (Minder/Yastık bilgisi)
    explanation?: string; // Opsiyonel
    createdAt?: any;
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

export interface PurchaseItem {
    groupId: string;
    categoryId: string;
    productId: string;
    productName: string; // Listede ID yerine isim göstermek için saklayalım
    colorId: string;
    cushionId: string;
    dimensionId: string;
    quantity: number;
    amount: number;
    explanation?: string;
    status: 'Alış' | 'İade'; // Her satırın durumu ayrı olabilir
}

// Fişin Kendisi (Başlık)
export interface Purchase {
    id?: string;
    storeId: string;       // Hangi mağazaya yapıldı?
    date: string;
    receiptNo: string;
    personnelId: string;   // Kim yaptı?
    personnelName: string; 
    items: PurchaseItem[]; // Ürün Listesi
    totalAmount: number;   // Fiş Genel Toplamı
    createdAt?: any;
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




//-----------SATIŞ MODÜLÜ----------------
export type SaleStatus = 'Sipariş' | 'Müşteri' | 'Teslim' | 'Stok' | 'İade' | 'İptal';

export interface SaleItem {
    // Seçim hiyerarşisi için
    groupId: string;
    categoryId: string;
    
    productId: string; 
    // Seçilen varyant (Ad + Renk + Ebat)
    colorId?: string;   
    productName: string; 
    dimensionId?: string | null;  // Listede göstermek için
    
    cushionId?: string;    // Minder seçimi (Satış anında)
    
    quantity: number;
    price: number;         // Birim Fiyat
    discount: number;      // İskonto Tutar
    total: number;         // (Fiyat - İskonto) * Adet
    
    productNote?: string;  // Ürün Açıklaması
    deadline?: string;     // Termin Tarihi
    status: SaleStatus;    // Satır bazlı durum
}

export interface Sale {
    id?: string;
    storeId: string;
    personnelId: string;
    personnelName: string;
    
    // Fiş Başlık Bilgileri
    date: string;
    receiptNo: string;
    
    // Müşteri Bilgileri
    customerName: string;
    phone: string;
    city: string;
    district: string;
    address: string;
    customerNote?: string;
    
    // Alt Bilgiler
    sshNote?: string;
    shippingNote?: string;
    shippingCost: number;
    
    items: SaleItem[];     // Ürün Listesi
    grandTotal: number;    // Genel Toplam
    createdAt?: any;
}