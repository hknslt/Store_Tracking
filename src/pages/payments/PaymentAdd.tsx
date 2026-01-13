// src/pages/payments/PaymentAdd.tsx
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { getStores } from "../../services/storeService";
// 👇 getSalesByStore YERİNE getDebtsByStore import edin
import { getDebtsByStore } from "../../services/debtService";
import { getPaymentMethods, addPaymentDocument } from "../../services/paymentService";

import type { Store, SystemUser, PaymentItem, PaymentMethod, Debt } from "../../types"; // Debt eklendi
import "../../App.css";

const PaymentAdd = () => {
    const { currentUser } = useAuth();

    // --- STATE'LER ---
    const [stores, setStores] = useState<Store[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]); // sales yerine debts kullanıyoruz
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

    const [currentUserData, setCurrentUserData] = useState<SystemUser | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    // Başlık Bilgileri
    const [headerData, setHeaderData] = useState({
        date: new Date().toISOString().split('T')[0],
        receiptNo: "",
        storeId: "",
        personnelName: ""
    });

    // Satırlar (Excel Mantığı)
    const [items, setItems] = useState<PaymentItem[]>([
        // Başlangıçta bir boş satır olsun
        { type: 'Tahsilat', paymentMethodId: "", amount: 0, description: "" }
    ]);

    // --- BAŞLANGIÇ ---
    useEffect(() => {
        const init = async () => {
            const methods = await getPaymentMethods();
            setPaymentMethods(methods);

            if (currentUser) {
                const userDoc = await getDoc(doc(db, "personnel", currentUser.uid));
                if (userDoc.exists()) {
                    const u = userDoc.data() as SystemUser;
                    setCurrentUserData(u);
                    setHeaderData(prev => ({ ...prev, personnelName: u.fullName }));

                    if (u.role === 'admin' || u.role === 'control') {
                        setIsAdmin(true);
                        getStores().then(setStores);
                    } else {
                        setIsAdmin(false);
                        if (u.storeId) setHeaderData(prev => ({ ...prev, storeId: u.storeId! }));
                    }
                }
            }
        };
        init();
    }, [currentUser]);

    // Mağaza değişince Borçları Çek (Tahsilat için)
    useEffect(() => {
        if (headerData.storeId) {
            getDebtsByStore(headerData.storeId).then(data => {
                // Sadece kalan borcu olanları veya hepsini filtreleyebilirsiniz
                // Örnek: Sadece borcu olanları gösterelim
                // setDebts(data.filter(d => d.remainingAmount > 0));
                setDebts(data);
            });
        } else {
            setDebts([]);
        }
    }, [headerData.storeId]);

    // --- İŞLEMLER ---

    // Satır Ekle
    const addRow = () => {
        setItems([...items, { type: 'Tahsilat', paymentMethodId: "", amount: 0, description: "" }]);
    };

    // Satır Sil
    const removeRow = (index: number) => {
        if (items.length === 1) return; // En az 1 satır kalsın
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    // Satır Güncelle (Excel Hücresi Mantığı)
    const updateItem = (index: number, field: keyof PaymentItem, value: any) => {
        const newItems = [...items];

        if (field === 'saleId') {
            // Seçilen borç kaydını bul
            const selectedDebt = debts.find(d => d.saleId === value); // ID, saleId olarak saklanmıştı

            newItems[index].saleId = value;
            newItems[index].saleReceiptNo = selectedDebt?.receiptNo || "";
            newItems[index].customerName = selectedDebt?.customerName || "";

            // İsterseniz otomatik olarak kalan tutarı 'Tutar' hanesine yazdırabilirsiniz:
            // newItems[index].amount = selectedDebt?.remainingAmount || 0;
        } else {
            newItems[index] = { ...newItems[index], [field]: value };
        }

        // Tip değişirse SaleId'yi sıfırla
        if (field === 'type' && value !== 'Tahsilat') {
            newItems[index].saleId = undefined;
            newItems[index].saleReceiptNo = undefined;
            newItems[index].customerName = undefined;
        }

        setItems(newItems);
    };

    // Kaydet
    // Kaydet
    const handleSave = async () => {
        // 1. Temel Kontroller
        if (!headerData.receiptNo) return alert("Lütfen Makbuz No giriniz.");
        if (!headerData.storeId) return alert("Lütfen bir Mağaza seçiniz.");

        // 2. Geçerli Satırları Filtrele
        const validItems = items.filter(i => i.amount > 0 && i.paymentMethodId);

        if (validItems.length === 0) {
            return alert("Lütfen en az bir geçerli işlem giriniz (Tutar 0'dan büyük olmalı ve Ödeme Yöntemi seçilmeli).");
        }

        // 3. Tahsilat İçin Fiş Seçimi Kontrolü (YENİ)
        const missingSaleSelection = validItems.find(i => i.type === 'Tahsilat' && !i.saleId);
        if (missingSaleSelection) {
            return alert("Hata: 'Tahsilat' işlemi seçtiğiniz satırlarda lütfen ilgili Satış/Fiş seçimini yapınız.");
        }

        try {
            await addPaymentDocument({
                storeId: headerData.storeId,
                receiptNo: headerData.receiptNo,
                date: headerData.date,
                personnelId: currentUser?.uid || "",
                personnelName: headerData.personnelName,
                items: validItems,
                totalAmount: validItems.reduce((acc, item) => acc + Number(item.amount), 0),
                createdAt: new Date()
            });

            alert("✅ İşlem Başarıyla Kaydedildi!");

            // Formu ve satırları sıfırla
            setHeaderData(prev => ({ ...prev, receiptNo: "" }));
            setItems([{ type: 'Tahsilat', paymentMethodId: "", amount: 0, description: "" }]);

            // Borç listesini yenile (bakiyeler değiştiği için)
            if (headerData.storeId) {
                getDebtsByStore(headerData.storeId).then(setDebts);
            }

        } catch (error: any) {
            console.error("Kayıt Hatası:", error);
            // Hatanın detayını ekrana yazdırıyoruz:
            alert("Hata oluştu: " + error.message);
        }
    };

    // --- CSS ---
    const cellStyle = { padding: '5px' };
    const inputStyle = { width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' };

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="page-title">
                    <h2>Kasa / Ödeme İşlemleri</h2>
                    <p>Tahsilat, Masraf ve Para Transferleri</p>
                </div>
                <button onClick={handleSave} className="btn btn-success" style={{ padding: '10px 30px', fontSize: '16px' }}>KAYDET</button>
            </div>

            {/* HEADER */}
            <div className="card" style={{ marginBottom: '20px', padding: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr', gap: '15px' }}>
                    <div>
                        <label className="form-label">Tarih</label>
                        <input type="date" className="form-input" value={headerData.date} onChange={e => setHeaderData({ ...headerData, date: e.target.value })} />
                    </div>
                    <div>
                        <label className="form-label">Mağaza</label>
                        {isAdmin ? (
                            <select className="form-input" value={headerData.storeId} onChange={e => setHeaderData({ ...headerData, storeId: e.target.value })}>
                                <option value="">Seçiniz...</option>
                                {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                            </select>
                        ) : (
                            <input className="form-input" disabled value={currentUserData?.storeId ? "Mağazam" : ""} style={{ backgroundColor: '#eee' }} />
                        )}
                    </div>
                    <div>
                        <label className="form-label">Makbuz No</label>
                        <input className="form-input" value={headerData.receiptNo} onChange={e => setHeaderData({ ...headerData, receiptNo: e.target.value })} placeholder="Evrak No" />
                    </div>
                    <div>
                        <label className="form-label">İşlemi Yapan</label>
                        <input className="form-input" disabled value={headerData.personnelName} style={{ backgroundColor: '#eee' }} />
                    </div>
                </div>
            </div>

            {/* TABLO (EXCEL MANTIĞI) */}
            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    <table className="data-table dense">
                        <thead>
                            <tr style={{ backgroundColor: '#f1f2f6' }}>
                                <th style={{ width: '120px' }}>İşlem Türü</th>
                                <th style={{ width: '250px' }}>Detay / Fiş Seçimi</th>
                                <th style={{ width: '150px' }}>Ödeme Yöntemi</th>
                                <th style={{ width: '120px', textAlign: 'right' }}>Tutar</th>
                                <th>Açıklama</th>
                                <th style={{ width: '50px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={index}>
                                    {/* 1. İŞLEM TÜRÜ */}
                                    <td style={cellStyle}>
                                        <select
                                            style={inputStyle}
                                            value={item.type}
                                            onChange={e => updateItem(index, 'type', e.target.value)}
                                        >
                                            <option value="Tahsilat">Tahsilat (+)</option>
                                            <option value="Merkez">Merkeze Transfer (-)</option>
                                            <option value="Masraf">Masraf (-)</option>
                                            <option value="E/F">Eksik/Fazla</option>
                                        </select>
                                    </td>

                                    {/* 2. DETAY (Tahsilat ise Satış Seç, Değilse Pasif) */}
                                    <td style={cellStyle}>
                                        {item.type === 'Tahsilat' ? (
                                            <select
                                                style={inputStyle}
                                                value={item.saleId || ""}
                                                onChange={e => updateItem(index, 'saleId', e.target.value)}
                                                disabled={!headerData.storeId}
                                            >
                                                <option value="">Satış / Müşteri Seç...</option>
                                                {debts.map(d => (
                                                    <option key={d.saleId} value={d.saleId} disabled={d.remainingAmount <= 0}>
                                                        {/* DROPDOWN GÖRÜNÜMÜ: Fiş No - Müşteri (Kalan: 100 TL) */}
                                                        {d.receiptNo} - {d.customerName} (Kalan: {d.remainingAmount} ₺)
                                                        {d.remainingAmount <= 0 ? ' - ÖDENDİ' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input disabled style={{ ...inputStyle, backgroundColor: '#eee' }} placeholder="-" />
                                        )}
                                    </td>

                                    {/* 3. ÖDEME YÖNTEMİ (Tanımlardan) */}
                                    <td style={cellStyle}>
                                        <select
                                            style={inputStyle}
                                            value={item.paymentMethodId}
                                            onChange={e => updateItem(index, 'paymentMethodId', e.target.value)}
                                        >
                                            <option value="">Seçiniz...</option>
                                            {paymentMethods.map(m => (
                                                <option key={m.id} value={m.name}>{m.name}</option>
                                            ))}
                                        </select>
                                    </td>

                                    {/* 4. TUTAR */}
                                    <td style={cellStyle}>
                                        <input
                                            type="number"
                                            style={{ ...inputStyle, textAlign: 'right', fontWeight: 'bold' }}
                                            value={item.amount}
                                            onChange={e => updateItem(index, 'amount', e.target.value)}
                                            onFocus={e => e.target.select()}
                                        />
                                    </td>

                                    {/* 5. AÇIKLAMA */}
                                    <td style={cellStyle}>
                                        <input
                                            type="text"
                                            style={inputStyle}
                                            value={item.description}
                                            onChange={e => updateItem(index, 'description', e.target.value)}
                                            placeholder="Açıklama giriniz..."
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && index === items.length - 1) {
                                                    addRow();
                                                }
                                            }}
                                        />
                                    </td>

                                    {/* 6. SİL BUTONU */}
                                    <td style={{ ...cellStyle, textAlign: 'center' }}>
                                        <button onClick={() => removeRow(index)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={6} style={{ padding: '10px' }}>
                                    <button onClick={addRow} className="btn btn-primary" style={{ width: '100%', padding: '8px' }}>+ Yeni Satır Ekle</button>
                                </td>
                            </tr>
                            <tr style={{ backgroundColor: '#e8f8f5', fontWeight: 'bold' }}>
                                <td colSpan={3} style={{ textAlign: 'right', padding: '10px' }}>TOPLAM TUTAR:</td>
                                <td style={{ textAlign: 'right', padding: '10px', fontSize: '16px', color: '#27ae60' }}>
                                    {items.reduce((acc, item) => acc + Number(item.amount), 0).toFixed(2)} ₺
                                </td>
                                <td></td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PaymentAdd;