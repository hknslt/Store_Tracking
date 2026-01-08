// src/types/index.ts

// --- TEMEL TANIMLAR ---
export interface Product {
    id?: string;
    productName: string;
    categoryId: string;
    groupId: string;
    explanation?: string;
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

// --- MAĞAZA & PERSONEL ---
export interface Store {
    id?: string;
    storeName: string;
    storeCode: string;
    address?: string;
    phone?: string;
}

export interface Personnel {
    id?: string;
    storeId: string;
    fullName: string;
    isActive: boolean;
    role: 'admin' | 'store_admin' | 'staff';
    startDate: string;
    endDate?: string;
    phone: string;
    address?: string;
    email?: string;
}

// --- MAĞAZA STOK MODÜLÜ (4'lü Stok Yapısı) ---
export interface StoreStock {
    id: string;          // uniqueStockId (ÜrünID_RenkID_EbatID)
    productId: string;
    productName: string; // Birleşik İsim
    colorId: string;
    dimensionId?: string | null;

    // 1. Serbest Stok: Depoda var, satılabilir.
    freeStock: number;

    // 2. Müşteri Rezerve: Depoda var ama satıldı.
    reservedStock: number;

    // 3. Beklenen Stok (Depo): Merkezden istendi, yolda.
    incomingStock: number;

    // 4. Beklenen Müşteri (Özel Sipariş): Müşteri için istendi, yolda.
    incomingReservedStock: number;
}

// --- ALIŞ / TALEP MODÜLÜ (SİPARİŞ VE STOK GİRİŞİ) ---

// İstenilen Durumlar:
export type PurchaseStatus = 'Beklemede' | 'Onaylandı' | 'Üretim' | 'Sevkiyat' | 'Tamamlandı' | 'İptal';
export type PurchaseType = 'Alış' | 'İade' | 'Sipariş'; // Sipariş: Satıştan otomatik düşen

export interface PurchaseItem {
    groupId: string;
    categoryId: string;
    productId: string;
    productName: string;
    colorId: string;
    cushionId: string;
    dimensionId?: string | null;

    quantity: number;
    amount: number;
    explanation?: string;

    // Ürün bazlı durum takibi (Örn: Biri üretimde, diğeri sevk edildi olabilir)
    status: PurchaseStatus;
}

export interface Purchase {
    id?: string;
    storeId: string;
    type?: PurchaseType; // Fişin türü
    contactName?: string;

    date: string;
    receiptNo: string;
    personnelId: string;
    personnelName: string;

    items: PurchaseItem[];
    totalAmount: number;
    createdAt?: any;
}

// --- SATIŞ MODÜLÜ (SİPARİŞ OLUŞTURMA) ---

export type SupplyMethod = 'Stoktan' | 'Merkezden';
export type DeliveryStatus = 'Bekliyor' | 'Teslim Edildi';
// Satış satırının genel durumu
export type SaleStatus = 'Sipariş' | 'İade' | 'İptal' | 'Tamamlandı';

export interface SaleItem {
    groupId: string;
    categoryId: string;
    productId: string;
    productName: string;
    colorId: string;
    dimensionId?: string | null;
    cushionId?: string;

    quantity: number;
    price: number;
    discount: number;
    total: number;

    productNote?: string;

    // Stok ve Teslimat Yönetimi
    supplyMethod: SupplyMethod;     // Stoktan mı düştü, Merkezden mi istendi?
    deliveryStatus: DeliveryStatus; // Müşteriye gitti mi?
    status: SaleStatus;             // Satırın genel durumu
}

export interface Sale {
    id?: string;
    storeId: string;
    personnelId: string;
    personnelName: string;

    date: string;
    receiptNo: string;

    customerName: string;
    phone: string;
    city: string;
    district: string;
    address: string;
    customerNote?: string;

    shippingCost: number;
    grandTotal: number;

    items: SaleItem[];
    createdAt?: any;
}