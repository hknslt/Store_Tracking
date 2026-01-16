// src/pages/payments/PaymentAdd.tsx
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { getStores } from "../../services/storeService";
import { getDebtsByStore } from "../../services/debtService";
import { getPaymentMethods, addPaymentDocument } from "../../services/paymentService";

import type { Store, SystemUser, PaymentItem, PaymentMethod, Debt, TransactionType, Personnel } from "../../types";
import "../../App.css";

const PaymentAdd = () => {
    const { currentUser } = useAuth();

    // --- STATE'LER ---
    const [stores, setStores] = useState<Store[]>([]);
    const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

    const [currentUserData, setCurrentUserData] = useState<SystemUser | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    // Mesaj Durumu (Hata / Başarı)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Başlık Bilgileri
    const [headerData, setHeaderData] = useState({
        date: new Date().toISOString().split('T')[0],
        receiptNo: "",
        storeId: "",
        personnelId: "",
        personnelName: ""
    });

    // SEÇİLEN İŞLEM TÜRÜ
    const [selectedType, setSelectedType] = useState<TransactionType>('Tahsilat');

    // Satırlar
    const [items, setItems] = useState<PaymentItem[]>([
        {
            type: 'Tahsilat',
            paymentMethodId: "",
            currency: 'TL',
            originalAmount: 0,
            exchangeRate: 1,
            amount: 0,
            description: ""
        }
    ]);

    // --- VERİ ÇEKME ---
    useEffect(() => {
        const init = async () => {
            const methods = await getPaymentMethods();
            setPaymentMethods(methods);

            if (currentUser) {
                const userDoc = await getDoc(doc(db, "personnel", currentUser.uid));
                if (userDoc.exists()) {
                    const u = userDoc.data() as SystemUser;
                    setCurrentUserData(u);

                    setHeaderData(prev => ({
                        ...prev,
                        personnelId: currentUser.uid,
                        personnelName: u.fullName
                    }));

                    if (u.role === 'admin' || u.role === 'control') {
                        setIsAdmin(true);
                        getStores().then(setStores);
                    } else {
                        setIsAdmin(false);
                        if (u.storeId) {
                            setHeaderData(prev => ({ ...prev, storeId: u.storeId! }));
                        }
                    }
                }
            }
        };
        init();
    }, [currentUser]);

    // Mağaza değişince verileri çek
    useEffect(() => {
        if (headerData.storeId) {
            getDebtsByStore(headerData.storeId).then(setDebts);

            const fetchPersonnel = async () => {
                const q = query(collection(db, "personnel"), where("storeId", "==", headerData.storeId));
                const snap = await getDocs(q);
                const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Personnel[];
                setPersonnelList(list);
            };
            fetchPersonnel();

        } else {
            setDebts([]);
            setPersonnelList([]);
        }
    }, [headerData.storeId]);

    // --- İŞLEMLER ---

    const handleTypeChange = (type: TransactionType) => {
        setSelectedType(type);
        setItems([{
            type: type,
            paymentMethodId: "",
            currency: 'TL',
            originalAmount: 0,
            exchangeRate: 1,
            amount: 0,
            description: ""
        }]);
    };

    const addRow = () => {
        setItems([...items, {
            type: selectedType,
            paymentMethodId: "",
            currency: 'TL',
            originalAmount: 0,
            exchangeRate: 1,
            amount: 0,
            description: ""
        }]);
    };

    const removeRow = (index: number) => {
        if (items.length === 1) return;
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    // MANUEL GİRİŞ GÜNCELLEME
    const updateItem = (index: number, field: keyof PaymentItem, value: any) => {
        const newItems = [...items];
        const item = { ...newItems[index], [field]: value };

        // 1. Eğer Para Birimi TL seçilirse:
        if (field === 'currency' && value === 'TL') {
            item.exchangeRate = 1;
            item.amount = Number(item.originalAmount);
        }

        // 2. Eğer "Miktar" (Orjinal) değişirse:
        if (field === 'originalAmount') {
            if (item.currency === 'TL') {
                item.amount = Number(value);
            }
        }

        // Tahsilat Fiş Seçimi
        if (field === 'saleId') {
            const selectedDebt = debts.find(d => d.saleId === value);
            item.saleId = value;
            item.saleReceiptNo = selectedDebt?.receiptNo || "";
            item.customerName = selectedDebt?.customerName || "";
        }

        newItems[index] = item;
        setItems(newItems);
    };

    const handleSave = async () => {
        setMessage(null); // Önceki mesajı temizle

        if (!headerData.receiptNo) { setMessage({ type: 'error', text: "Lütfen Makbuz No giriniz." }); return; }
        if (!headerData.storeId) { setMessage({ type: 'error', text: "Lütfen Mağaza seçiniz." }); return; }
        if (!headerData.personnelId) { setMessage({ type: 'error', text: "Lütfen Personel seçiniz." }); return; }

        const validItems = items.filter(i => i.amount > 0 && i.paymentMethodId);
        if (validItems.length === 0) { setMessage({ type: 'error', text: "Geçerli bir işlem giriniz (TL Tutarı 0'dan büyük olmalı ve Ödeme Yöntemi seçilmeli)." }); return; }

        if (selectedType === 'Tahsilat') {
            const missingSale = validItems.find(i => !i.saleId);
            if (missingSale) { setMessage({ type: 'error', text: "Tahsilat işlemlerinde Fiş/Müşteri seçimi zorunludur." }); return; }
        }

        try {
            await addPaymentDocument({
                storeId: headerData.storeId,
                receiptNo: headerData.receiptNo,
                date: headerData.date,
                personnelId: headerData.personnelId,
                personnelName: headerData.personnelName,
                items: validItems,
                totalAmount: validItems.reduce((acc, item) => acc + Number(item.amount), 0),
                createdAt: new Date()
            });

            setMessage({ type: 'success', text: "✅ İşlem Başarıyla Kaydedildi!" });

            // Başarılı kayıttan sonra formu temizle
            setHeaderData(prev => ({ ...prev, receiptNo: "" }));
            handleTypeChange('Tahsilat');
            if (headerData.storeId) getDebtsByStore(headerData.storeId).then(setDebts);

            // 3 saniye sonra mesajı kaldır
            setTimeout(() => setMessage(null), 3000);

        } catch (error: any) {
            console.error(error);
            setMessage({ type: 'error', text: "Hata oluştu: " + error.message });
        }
    };

    // --- CSS ---
    const cellStyle = { padding: '8px' };
    const inputStyle = { width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' };
    const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: '600', color: '#34495e', fontSize: '13px' };

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="page-title">
                    <h2>Finansal İşlemler</h2>
                    <p>Tahsilat, Ödeme ve Para Transferleri</p>
                </div>
                <button onClick={handleSave} className="btn btn-success" style={{ padding: '10px 30px', fontSize: '16px' }}>KAYDET</button>
            </div>

            {/* MESAJ KUTUSU (Alert yerine) */}
            {message && (
                <div style={{
                    padding: '15px',
                    marginBottom: '20px',
                    borderRadius: '8px',
                    backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color: message.type === 'success' ? '#166534' : '#991b1b',
                    border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontWeight: '500'
                }}>
                    <span>{message.type === 'success' ? '✓' : '⚠️'}</span>
                    {message.text}
                </div>
            )}

            {/* HEADER */}
            <div className="card" style={{ marginBottom: '20px', padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                    <div>
                        <label style={labelStyle}>Tarih</label>
                        <input type="date" style={inputStyle} value={headerData.date} onChange={e => setHeaderData({ ...headerData, date: e.target.value })} />
                    </div>
                    <div>
                        <label style={labelStyle}>Mağaza</label>
                        {isAdmin ? (
                            <select style={inputStyle} value={headerData.storeId} onChange={e => setHeaderData({ ...headerData, storeId: e.target.value })}>
                                <option value="">Seçiniz...</option>
                                {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                            </select>
                        ) : (
                            <input style={{ ...inputStyle, backgroundColor: '#f8f9fa' }} disabled value={currentUserData?.storeId ? "Mağazam" : ""} />
                        )}
                    </div>
                    <div>
                        <label style={labelStyle}>Makbuz / Evrak No</label>
                        <input style={inputStyle} value={headerData.receiptNo} onChange={e => setHeaderData({ ...headerData, receiptNo: e.target.value })} placeholder="Örn: T-2024-001" />
                    </div>
                    <div>
                        <label style={labelStyle}>İşlemi Yapan Personel</label>
                        <select
                            style={inputStyle}
                            value={headerData.personnelId}
                            onChange={e => {
                                const p = personnelList.find(x => x.id === e.target.value);
                                setHeaderData({ ...headerData, personnelId: e.target.value, personnelName: p?.fullName || "" });
                            }}
                        >
                            <option value="">Seçiniz...</option>
                            {!personnelList.find(p => p.id === currentUser?.uid) && currentUserData && (
                                <option value={currentUser?.uid}>{currentUserData.fullName}</option>
                            )}
                            {personnelList.map(p => (
                                <option key={p.id} value={p.id}>{p.fullName}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* İŞLEM TÜRÜ SEÇİMİ */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                {['Tahsilat', 'Masraf', 'Merkez', 'E/F'].map((type) => (
                    <button
                        key={type}
                        onClick={() => handleTypeChange(type as TransactionType)}
                        style={{
                            flex: 1,
                            padding: '15px',
                            border: 'none',
                            borderRadius: '10px',
                            backgroundColor: selectedType === type ? '#145a32' : 'white',
                            color: selectedType === type ? 'white' : '#7f8c8d',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '15px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                            transition: 'all 0.2s'
                        }}
                    >
                        {type === 'Tahsilat' ? '💰 Tahsilat (Giriş)' :
                            type === 'Masraf' ? '🧾 Masraf (Çıkış)' :
                                type === 'Merkez' ? '🏦 Merkeze Transfer' : '⚖️ Eksik / Fazla'}
                    </button>
                ))}
            </div>

            {/* TABLO */}
            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    <table className="data-table dense">
                        <thead>
                            <tr style={{ backgroundColor: '#f1f2f6' }}>
                                {selectedType === 'Tahsilat' && <th style={{ width: '25%' }}>Müşteri / Fiş Seçimi</th>}
                                <th style={{ width: '15%' }}>Ödeme Yöntemi</th>
                                <th style={{ width: '10%' }}>Birim</th>
                                <th style={{ width: '12%', textAlign: 'right' }}>Döviz Miktarı</th>
                                <th style={{ width: '15%', textAlign: 'right' }}>TL Karşılığı (Giriş)</th>
                                <th>Açıklama</th>
                                <th style={{ width: '50px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={index}>

                                    {/* 1. Müşteri Seçimi */}
                                    {selectedType === 'Tahsilat' && (
                                        <td style={cellStyle}>
                                            <select
                                                style={inputStyle}
                                                value={item.saleId || ""}
                                                onChange={e => updateItem(index, 'saleId', e.target.value)}
                                                disabled={!headerData.storeId}
                                            >
                                                <option value="">Seçiniz...</option>
                                                {debts.map(d => (
                                                    <option key={d.saleId} value={d.saleId} disabled={d.remainingAmount <= 0}>
                                                        {d.receiptNo} - {d.customerName} (Kalan: {d.remainingAmount} ₺)
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                    )}

                                    {/* 2. Ödeme Yöntemi */}
                                    <td style={cellStyle}>
                                        <select style={inputStyle} value={item.paymentMethodId} onChange={e => updateItem(index, 'paymentMethodId', e.target.value)}>
                                            <option value="">Seçiniz...</option>
                                            {paymentMethods.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                                        </select>
                                    </td>

                                    {/* 3. Para Birimi */}
                                    <td style={cellStyle}>
                                        <select
                                            style={{ ...inputStyle, fontWeight: 'bold' }}
                                            value={item.currency}
                                            onChange={e => updateItem(index, 'currency', e.target.value)}
                                        >
                                            <option value="TL">TL ₺</option>
                                            <option value="USD">USD $</option>
                                            <option value="EUR">EUR €</option>
                                            <option value="GBP">GBP £</option>
                                        </select>
                                    </td>

                                    {/* 4. Döviz Miktarı (Original) */}
                                    <td style={cellStyle}>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            style={{ ...inputStyle, textAlign: 'right' }}
                                            value={item.originalAmount || ""}
                                            onChange={e => updateItem(index, 'originalAmount', e.target.value)}
                                        />
                                    </td>

                                    {/* 5. TL Karşılığı (Manuel Giriş) */}
                                    <td style={cellStyle}>
                                        <input
                                            type="number"
                                            placeholder="TL Tutarı"
                                            disabled={item.currency === 'TL'}
                                            style={{
                                                ...inputStyle,
                                                textAlign: 'right',
                                                backgroundColor: item.currency === 'TL' ? '#e9ecef' : '#fff',
                                                fontWeight: 'bold',
                                                color: '#2c3e50',
                                                border: item.currency !== 'TL' ? '2px solid #3498db' : '1px solid #ddd'
                                            }}
                                            value={item.amount || ""}
                                            onChange={e => updateItem(index, 'amount', e.target.value)}
                                        />
                                    </td>

                                    {/* 6. Açıklama */}
                                    <td style={cellStyle}>
                                        <input
                                            type="text"
                                            style={inputStyle}
                                            value={item.description}
                                            onChange={e => updateItem(index, 'description', e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') addRow(); }}
                                        />
                                    </td>

                                    {/* 7. Sil */}
                                    <td style={{ ...cellStyle, textAlign: 'center' }}>
                                        <button onClick={() => removeRow(index)} style={{ color: '#e74c3c', border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={selectedType === 'Tahsilat' ? 7 : 6} style={{ padding: '10px' }}>
                                    <button onClick={addRow} className="btn btn-primary" style={{ width: '100%', padding: '8px' }}>+ Yeni Satır Ekle</button>
                                </td>
                            </tr>
                            <tr style={{ backgroundColor: '#e8f8f5', fontWeight: 'bold' }}>
                                <td colSpan={selectedType === 'Tahsilat' ? 4 : 3} style={{ textAlign: 'right', padding: '15px' }}>GENEL TOPLAM (TL):</td>
                                <td style={{ textAlign: 'right', padding: '15px', fontSize: '18px', color: '#27ae60' }}>
                                    {items.reduce((acc, item) => acc + Number(item.amount), 0).toFixed(2)} ₺
                                </td>
                                <td colSpan={2}></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PaymentAdd;