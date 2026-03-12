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