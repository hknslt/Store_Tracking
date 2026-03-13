// src/utils/excelExport.ts
import * as XLSX from 'xlsx';

export const exportDebtsToExcel = (debts: any[], storeName: string) => {
    // 1. Günün tarihini formatla
    const dateStr = new Date().toLocaleDateString('tr-TR');

    // 2. Excel'in içine yazılacak verileri bir dizi (Array) olarak hazırla
    // İlk satır: Mağaza Adı ve Tarih
    const wsData = [
        [`${storeName} - Müşteri Borç Listesi`, '', '', 'Tarih:', dateStr],
        [], // İkinci satırı boşluk bırakıyoruz (Şık durması için)
        ['Fiş Numarası', 'Müşteri Adı', 'Toplam Tutar (₺)', 'Ödenen (₺)', 'Kalan Borç (₺)'] // Sütun Başlıkları
    ];

    // 3. Veritabanından gelen borçları satır satır Excel verisine ekle
    debts.forEach(debt => {
        wsData.push([
            debt.receiptNo,
            debt.customerName,
            debt.totalAmount,
            debt.paidAmount || 0,
            debt.remainingAmount
        ]);
    });

    // 4. Veriyi Excel çalışma sayfasına (Worksheet) dönüştür
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Sütun genişliklerini ayarla (İsteğe bağlı görsel düzeltme)
    ws['!cols'] = [
        { wch: 15 }, // Fiş No
        { wch: 25 }, // Müşteri Adı
        { wch: 15 }, // Toplam
        { wch: 15 }, // Ödenen
        { wch: 15 }  // Kalan
    ];

    // 5. Çalışma kitabı (Workbook) oluştur ve sayfayı içine ekle
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Borçlar");

    // 6. Excel dosyasını kullanıcıya indir
    XLSX.writeFile(wb, `${storeName}_Borc_Raporu_${dateStr}.xlsx`);
};

export const exportSalesToExcel = (
    sales: any[],
    storeName: string,
    categories: any[],
    cushions: any[],
    colors: any[],
    dimensions: any[]
) => {
    const dateStr = new Date().toLocaleDateString('tr-TR');

    // Başlıklar
    const wsData = [
        [`${storeName} - Satış Listesi`, '', '', '', '', '', 'Tarih:', dateStr],
        [],
        ['Tarih', 'Fiş No', 'Müşteri Adı', 'Telefon', 'Kategori', 'Ürün Adı', 'Renk', 'Ebat', 'Minder', 'Adet', 'Tutar (₺)', 'Durum']
    ];

    // Yardımcı: ID'den İsim Bulma
    const getName = (list: any[], id: string, key: string) => list.find(x => x.id === id)?.[key] || "-";

    // Verileri Düzleştirerek (Flatten) Ekleme
    sales.forEach(sale => {
        const saleDate = sale.date ? new Date(sale.date).toLocaleDateString('tr-TR') : "-";

        sale.items.forEach((item: any) => {
            wsData.push([
                saleDate,
                sale.receiptNo,
                sale.customerName,
                sale.phone || "-",
                getName(categories, item.categoryId, 'categoryName'),
                item.productName.split('-')[0].trim(),
                getName(colors, item.colorId, 'colorName'),
                getName(dimensions, item.dimensionId, 'dimensionName'),
                getName(cushions, item.cushionId, 'cushionName'),
                item.quantity,
                item.total,
                item.deliveryStatus
            ]);
        });
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Sütun Genişlikleri
    ws['!cols'] = [
        { wch: 12 }, // Tarih
        { wch: 12 }, // Fiş No
        { wch: 20 }, // Müşteri
        { wch: 15 }, // Telefon
        { wch: 15 }, // Kategori
        { wch: 25 }, // Ürün
        { wch: 15 }, // Renk
        { wch: 10 }, // Ebat
        { wch: 15 }, // Minder
        { wch: 8 },  // Adet
        { wch: 12 }, // Tutar
        { wch: 15 }  // Durum
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Satışlar");
    XLSX.writeFile(wb, `${storeName}_Satis_Listesi_${dateStr}.xlsx`);
};

export const exportPurchasesToExcel = (
    purchases: any[],
    storeName: string,
    categories: any[],
    cushions: any[],
    colors: any[],
    dimensions: any[]
) => {
    const dateStr = new Date().toLocaleDateString('tr-TR');

    // Başlıklar
    const wsData = [
        [`${storeName} - Alış / Stok Giriş Listesi`, '', '', '', '', '', 'Tarih:', dateStr],
        [],
        ['Tarih', 'Fiş No', 'İşlemi Yapan', 'Kategori', 'Ürün Adı', 'Renk', 'Ebat', 'Minder', 'Adet', 'Birim Fiyat', 'Toplam Tutar', 'Durum', 'Açıklama']
    ];

    // Yardımcı: ID'den İsim Bulma
    const getName = (list: any[], id: string, key: string) => list.find(x => x.id === id)?.[key] || "-";

    // Verileri Düzleştirerek Ekleme
    purchases.forEach(purchase => {
        const purchaseDate = purchase.date ? new Date(purchase.date).toLocaleDateString('tr-TR') : "-";

        purchase.items.forEach((item: any) => {
            const unitPrice = item.quantity > 0 ? (item.amount / item.quantity).toFixed(2) : 0;

            wsData.push([
                purchaseDate,
                purchase.receiptNo,
                purchase.personnelName || "-",
                getName(categories, item.categoryId, 'categoryName'),
                item.productName.split('-')[0].trim(),
                getName(colors, item.colorId, 'colorName'),
                getName(dimensions, item.dimensionId, 'dimensionName'),
                getName(cushions, item.cushionId, 'cushionName'),
                item.quantity,
                unitPrice, // Birim Fiyat
                item.amount, // Toplam Tutar
                item.status,
                item.explanation || "-"
            ]);
        });
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Sütun Genişlikleri
    ws['!cols'] = [
        { wch: 12 }, // Tarih
        { wch: 12 }, // Fiş No
        { wch: 20 }, // İşlemi Yapan
        { wch: 15 }, // Kategori
        { wch: 25 }, // Ürün
        { wch: 15 }, // Renk
        { wch: 10 }, // Ebat
        { wch: 15 }, // Minder
        { wch: 8 },  // Adet
        { wch: 12 }, // Birim Fiyat
        { wch: 12 }, // Toplam Tutar
        { wch: 15 }, // Durum
        { wch: 20 }  // Açıklama
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Alışlar");
    XLSX.writeFile(wb, `${storeName}_Alis_Listesi_${dateStr}.xlsx`);
};