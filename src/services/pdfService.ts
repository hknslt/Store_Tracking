// src/services/pdfService.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Sale, Category, Cushion, Color, Dimension, Purchase } from '../types';

// Türkçe karakterleri İngilizce karşılıklarına çeviren yardımcı fonksiyon
const normalizeText = (text: string | undefined | null) => {
    if (!text) return "";
    const map: Record<string, string> = {
        'ğ': 'g', 'Ğ': 'G', 'ş': 's', 'Ş': 'S',
        'ı': 'i', 'İ': 'I', 'ü': 'u', 'Ü': 'U',
        'ö': 'o', 'Ö': 'O', 'ç': 'c', 'Ç': 'C'
    };
    return text.replace(/[ğĞşŞıİüÜöÖçÇ]/g, (char) => map[char] || char);
};

export const generateSalesPDF = (
    sales: Sale[],
    storeName: string,
    categories: Category[],
    cushions: Cushion[],
    colors: Color[],
    dimensions: Dimension[]
) => {
    const doc = new jsPDF();

    // -- RENK PALETİ --
    const PRIMARY_COLOR = [41, 128, 185] as [number, number, number]; // Kurumsal Mavi
    const HEADER_BG = [236, 240, 241] as [number, number, number];    // Çok Açık Gri
    const TEXT_DARK = [44, 62, 80] as [number, number, number];       // Koyu Yazı Rengi

    // -- PDF BAŞLIK ALANI --
    doc.setFontSize(22);
    doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    doc.text(normalizeText(storeName), 14, 20); // Mağaza Adı (Büyük)

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(normalizeText("Siparis ve Teslimat Listesi"), 14, 27); // Alt Başlık

    doc.setFontSize(10);
    doc.text(normalizeText(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`), 195, 20, { align: 'right' });

    // Başlık altı çizgi
    doc.setDrawColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    doc.setLineWidth(0.5);
    doc.line(14, 32, 196, 32);

    const tableData: any[] = [];

    sales.forEach((sale) => {
        // 1. SİPARİŞ BAŞLIĞI (Renkli Şerit)
        // Her siparişin başında mavi zeminli, beyaz yazılı bir başlık olur.
        tableData.push([
            {
                content: normalizeText(`FIS: ${sale.receiptNo}   |   MUSTERI: ${sale.customerName}   |   TEL: ${sale.phone || '-'}`),
                colSpan: 5,
                styles: {
                    fillColor: PRIMARY_COLOR,
                    textColor: [255, 255, 255], // Beyaz yazı
                    fontStyle: 'bold',
                    fontSize: 10,
                    cellPadding: 4 // Biraz daha geniş
                }
            }
        ]);

        // 2. SÜTUN BAŞLIKLARI (Her siparişin içinde tekrar eder, okumayı kolaylaştırır)
        tableData.push([
            { content: normalizeText('URUN'), styles: { fillColor: HEADER_BG, fontStyle: 'bold', textColor: TEXT_DARK } },
            { content: normalizeText('RENK'), styles: { fillColor: HEADER_BG, fontStyle: 'bold', textColor: TEXT_DARK } },
            { content: normalizeText('MINDER'), styles: { fillColor: HEADER_BG, fontStyle: 'bold', textColor: TEXT_DARK } },
            { content: normalizeText('ADET'), styles: { fillColor: HEADER_BG, fontStyle: 'bold', textColor: TEXT_DARK, halign: 'center' } },
            { content: normalizeText('NOT'), styles: { fillColor: HEADER_BG, fontStyle: 'bold', textColor: TEXT_DARK } }
        ]);

        // 3. ÜRÜN SATIRLARI
        sale.items.forEach((item) => {
            // İsimleri Bulma
            const catName = categories.find(c => c.id === item.categoryId)?.categoryName || "";
            const colorName = colors.find(c => c.id === item.colorId)?.colorName || "-";
            const cushionName = cushions.find(c => c.id === item.cushionId)?.cushionName || "-";
            const dimName = item.dimensionId ? dimensions.find(d => d.id === item.dimensionId)?.dimensionName : "";

            let productNameFull = item.productName;
            if (dimName) productNameFull += ` ${dimName}`;
            // Kategori adını parantez içinde ekleyelim
            if (catName) productNameFull += ` (${catName})`;

            tableData.push([
                normalizeText(productNameFull),
                normalizeText(colorName),
                normalizeText(cushionName),
                { content: item.quantity, styles: { halign: 'center', fontStyle: 'bold' } }, // Adet ortalı ve kalın
                normalizeText(item.productNote || '-')
            ]);
        });

        // 4. AYIRAÇ (Boşluk)
        // Siparişler birbirine yapışmasın diye araya boş, kenarlıksız satır ekliyoruz
        tableData.push([{ content: '', colSpan: 5, styles: { minCellHeight: 10, fillColor: [255, 255, 255], lineWidth: 0 } }]);
    });

    // Tabloyu Çizdir
    autoTable(doc, {
        body: tableData,
        startY: 38,
        theme: 'grid', // Izgara görünümü
        styles: {
            fontSize: 9,
            cellPadding: 3,
            lineColor: [220, 220, 220], // Hafif gri çizgiler
            lineWidth: 0.1,
            textColor: TEXT_DARK,
            valign: 'middle'
        },
        // Otomatik header'ı kapatıyoruz çünkü manuel olarak her siparişin başına ekledik
        showHead: 'never'
    });

    doc.save(`Satis_Listesi_${storeName}_${new Date().toISOString().split('T')[0]}.pdf`);
};



export const generatePurchasePDF = (
    purchases: Purchase[],
    storeName: string,
    categories: Category[],
    cushions: Cushion[],
    colors: Color[],
    dimensions: Dimension[]
) => {
    const doc = new jsPDF();

    // Renkler (Yeşil Temalı)
    const PRIMARY_COLOR = [39, 174, 96] as [number, number, number];
    const HEADER_BG = [236, 240, 241] as [number, number, number];
    const TEXT_DARK = [44, 62, 80] as [number, number, number];

    // Başlık
    doc.setFontSize(18);
    doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    doc.text(normalizeText(storeName), 14, 20);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(normalizeText("Alis ve Stok Giris Listesi"), 14, 26);

    doc.setFontSize(10);
    doc.text(normalizeText(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`), 195, 20, { align: 'right' });

    doc.setDrawColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    doc.line(14, 30, 196, 30);

    const tableData: any[] = [];

    purchases.forEach((p) => {
        // Sipariş Başlığı
        tableData.push([
            {
                content: normalizeText(`FIS: ${p.receiptNo}   |   PERSONEL: ${p.personnelName}   |   TUTAR: ${p.totalAmount} TL`),
                colSpan: 5,
                styles: { fillColor: PRIMARY_COLOR, textColor: 255, fontStyle: 'bold' }
            }
        ]);

        // Sütun Başlıkları
        tableData.push([
            { content: 'URUN', styles: { fillColor: HEADER_BG, fontStyle: 'bold' } },
            { content: 'OZELLIKLER', styles: { fillColor: HEADER_BG, fontStyle: 'bold' } },
            { content: 'DURUM', styles: { fillColor: HEADER_BG, fontStyle: 'bold' } },
            { content: 'ADET', styles: { fillColor: HEADER_BG, fontStyle: 'bold', halign: 'center' } },
            { content: 'NOT', styles: { fillColor: HEADER_BG, fontStyle: 'bold' } }
        ]);

        // Ürünler
        p.items.forEach((item) => {
            const catName = categories.find(c => c.id === item.categoryId)?.categoryName || "";
            const colorName = colors.find(c => c.id === item.colorId)?.colorName || "-";
            const cushionName = cushions.find(c => c.id === item.cushionId)?.cushionName || "-";
            const dimName = item.dimensionId ? dimensions.find(d => d.id === item.dimensionId)?.dimensionName : "";

            let prodName = item.productName;
            if (dimName) prodName += ` ${dimName}`;
            if (catName) prodName += ` (${catName})`;

            tableData.push([
                normalizeText(prodName),
                normalizeText(`R: ${colorName} / M: ${cushionName}`),
                normalizeText(item.status),
                { content: item.quantity, styles: { halign: 'center', fontStyle: 'bold' } },
                normalizeText(item.explanation || '-')
            ]);
        });

        // Boşluk
        tableData.push([{ content: '', colSpan: 5, styles: { minCellHeight: 8, fillColor: 255 } }]);
    });

    autoTable(doc, {
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.1, textColor: TEXT_DARK },
        showHead: 'never'
    });

    doc.save(`Alis_Listesi_${new Date().toISOString().split('T')[0]}.pdf`);
};