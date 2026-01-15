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
    currentBalance?: StoreBalance;
}


export interface SystemUser {
    id: string; // Auth UID
    fullName: string;
    email: string;
    role: 'admin' | 'store_admin' | 'control' | 'report';
    storeId?: string; // Sadece store_admin için dolu olur
    phone?: string;
    address?: string;
    isActive: boolean;
}
export interface Personnel {
    id?: string;
    storeId: string;
    fullName: string;
    role: 'staff'; // Sabit rol
    startDate: string;
    endDate?: string;
    phone: string;
    address?: string;
    isActive: boolean;
    // Email ve Password YOK
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
    itemType: 'Stok' | 'Sipariş';
}

export interface Purchase {
    id?: string;
    storeId: string;
    type?: PurchaseType; // Fişin türü

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
export type DeliveryStatus = 'Bekliyor' | 'Teslim Edildi' | 'İptal';
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
    deadline: string;

    shippingCost: number;
    grandTotal: number;

    items: SaleItem[];
    createdAt?: any;
}




// --- PUANTAJ ---
export type AttendanceType =
    | 'Geldi'
    | 'Raporlu'
    | 'Ücretsiz İzin'
    | 'Haftalık İzin'
    | 'Yıllık İzin';

// Veritabanında bir ayın tamamını tutan belge yapısı
export interface MonthlyAttendance {
    id?: string; // Belge ID'si (Örn: 2024_05)
    storeId: string;
    month: string; // "2024-05" formatında
    records: Record<string, AttendanceType>;
}


// --- BEKLEYEN TALEP (Pending Request) ---
export interface PendingRequest {
    id?: string;
    storeId: string;
    saleId: string;      // Hangi satıştan geldi
    saleReceiptNo: string;
    customerName: string;

    // Ürün Bilgileri
    groupId: string;
    categoryId: string;
    productId: string;
    productName: string;
    colorId: string;
    cushionId: string;
    dimensionId?: string | null;

    quantity: number;
    requestDate: string; // Talep tarihi
    productNote?: string;
}

export interface Price {
    id?: string;        // Firebase Doc ID (örn: "prod123_dim456")
    productId: string;
    dimensionId: string | null; // null ise standart fiyat, dolu ise o ebata ait fiyat
    amount: number;
}


// --- SSH (SATIŞ SONRASI HİZMETLER) ---
export interface SSHItem {
    description: string; // Yapılan işlem (Örn: Ayak değişimi)
    price: number;       // İşlem tutarı
}

export interface SSHRecord {
    id?: string;
    storeId: string;
    saleId: string;        // Hangi satışa ait olduğu
    saleReceiptNo: string; // Fiş No
    customerName: string;  // Müşteri Adı
    phone: string;         // İletişim

    items: SSHItem[];      // Yapılan işlemler listesi
    totalCost: number;     // Toplam Servis Ücreti

    shippingMethod: string; // Sevkiyat (Mağazadan, Nakliye, Kargo)
    status: 'Açık' | 'Kapalı'; // Servis durumu
    createdAt: string;     // Kayıt tarihi
}




export interface PaymentMethod {
    id?: string;
    name: string; // Nakit, Kredi Kartı, Havale/EFT, Sodexo vb.
}

// --- ÖDEME İŞLEM TİPLERİ ---
export type TransactionType = 'Tahsilat' | 'Merkez' | 'Masraf' | 'E/F';
export type Currency = 'TL' | 'USD' | 'EUR' | 'GBP';


//Kasa Bakiyesi Yapısı
export interface StoreBalance {
    TL: number;
    USD: number;
    EUR: number;
    GBP: number;
}


// --- ÖDEME SATIRI (Excel Satırı) ---
export interface PaymentItem {
    type: TransactionType;      // Tahsilat, Masraf vb.

    // Tahsilat Detayları
    saleId?: string;
    saleReceiptNo?: string;
    customerName?: string;

    // Ödeme Detayları
    paymentMethodId: string;    // Nakit, KK vb.

    // 💰 DÖVİZ YÖNETİMİ 💰
    currency: Currency;         // Seçilen Para Birimi
    originalAmount: number;     // Döviz Tutarı (Örn: 100 $)
    exchangeRate: number;       // Kur (Örn: 32.50)
    amount: number;             // TL Karşılığı (Hesaplanan: 3250 TL) - Sistem bunu esas alır

    description: string;
}

// --- ÖDEME MAKBUZU (Ana Belge) ---
export interface PaymentDocument {
    id?: string;
    storeId: string;
    receiptNo: string;          // Makbuz No (Örn: M-2024-001)
    date: string;

    personnelId: string;        // İşlemi yapan
    personnelName: string;

    items: PaymentItem[];       // İşlemler
    totalAmount: number;        // Toplam Tutar (Sadece bilgi amaçlı)
    createdAt?: any;
}


export interface Debt {
    id?: string;
    storeId: string;
    saleId: string;          // Hangi satışa ait?
    receiptNo: string;       // Fiş No
    customerName: string;    // Müşteri Adı
    saleDate: string;        // Satış Tarihi

    totalAmount: number;     // Toplam Borç (Satış Tutarı)
    paidAmount: number;      // Bugüne kadar ödenen
    remainingAmount: number; // Kalan Borç (Total - Paid)

    status: 'Ödenmedi' | 'Kısmi Ödeme' | 'Ödendi';
    lastPaymentDate?: string;
}