// src/pages/payments/PaymentEdit.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPaymentById, updatePaymentDocument, getPaymentMethods } from "../../services/paymentService";
import { getDebtsByStore } from "../../services/debtService";
import type { PaymentDocument, PaymentItem, PaymentMethod, Debt } from "../../types";
import "../../App.css";

const PaymentEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [payment, setPayment] = useState<PaymentDocument | null>(null);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [items, setItems] = useState<PaymentItem[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    useEffect(() => {
        const loadData = async () => {
            if (!id) return;
            try {
                const methods = await getPaymentMethods();
                setPaymentMethods(methods);

                const pData = await getPaymentById(id);
                if (!pData) { navigate('/payments'); return; }

                setPayment(pData);
                setItems(pData.items);

                // Mağazanın borçlarını çek
                const storeDebts = await getDebtsByStore(pData.storeId);
                setDebts(storeDebts);
            } catch (error) { console.error(error); } finally { setLoading(false); }
        };
        loadData();
    }, [id, navigate]);

    const addRow = () => {
        setItems([...items, { type: 'Tahsilat', paymentMethodId: "", currency: 'TL', originalAmount: 0, exchangeRate: 1, amount: 0, description: "" }]);
    };

    const removeRow = (index: number) => {
        if (items.length === 1) return;
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const updateItem = (index: number, field: keyof PaymentItem, value: any) => {
        const newItems = [...items];
        const item = { ...newItems[index], [field]: value };

        if (field === 'currency' && value === 'TL') {
            item.exchangeRate = 1;
            item.amount = Number(item.originalAmount);
        }
        if (field === 'originalAmount' && item.currency === 'TL') {
            item.amount = Number(value);
        }
        if (field === 'type') {
            item.saleId = ""; item.saleReceiptNo = ""; item.customerName = "";
        }
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
        if (!payment) return;
        setMessage(null);

        const validItems = items.filter(i => i.amount > 0 && i.paymentMethodId);
        if (validItems.length === 0) { setMessage({ type: 'error', text: "Geçerli bir işlem giriniz." }); return; }

        setSaving(true);
        try {
            const updatedPayment: PaymentDocument = {
                ...payment,
                items: validItems,
                totalAmount: validItems.reduce((acc, item) => acc + Number(item.amount), 0)
            };

            await updatePaymentDocument(id!, updatedPayment);

            setMessage({ type: 'success', text: "✅ İşlem başarıyla güncellendi!" });
            setTimeout(() => navigate(`/payments/detail/${id}`), 1500);
        } catch (error: any) {
            setMessage({ type: 'error', text: "Hata oluştu: " + error.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="page-container">Yükleniyor...</div>;
    if (!payment) return <div className="page-container">Belge bulunamadı.</div>;

    const inputStyle = { width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' };

    return (
        <div className="page-container">
            {message && (
                <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, padding: '15px 25px', borderRadius: '8px', color: 'white', fontWeight: '600', backgroundColor: message.type === 'success' ? '#10b981' : '#ef4444' }}>
                    {message.text}
                </div>
            )}

            <div className="modern-header">
                <div>
                    <h2>Kasa İşlemini Düzenle</h2>
                    <p>Makbuz No: <strong>{payment.receiptNo}</strong></p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => navigate(`/payments/detail/${id}`)} className="modern-btn btn-secondary">İptal</button>
                    <button onClick={handleSave} disabled={saving} className="modern-btn btn-primary">
                        {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                    </button>
                </div>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    <table className="data-table dense">
                        <thead>
                            <tr style={{ backgroundColor: '#f1f2f6' }}>
                                <th style={{ width: '15%' }}>İşlem Türü</th>
                                <th style={{ width: '25%' }}>Müşteri / Fiş Seçimi</th>
                                <th style={{ width: '15%' }}>Ödeme Yöntemi</th>
                                <th style={{ width: '10%' }}>Birim</th>
                                <th style={{ width: '10%', textAlign: 'right' }}>Döviz Mik.</th>
                                <th style={{ width: '10%', textAlign: 'right' }}>TL Tutarı</th>
                                <th>Açıklama</th>
                                <th style={{ width: '50px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={index}>
                                    <td style={{ padding: '8px' }}>
                                        <select style={inputStyle} value={item.type} onChange={e => updateItem(index, 'type', e.target.value)}>
                                            <option value="Tahsilat">Tahsilat</option>
                                            <option value="Masraf">Masraf</option>
                                            <option value="Merkez">Merkeze Tr.</option>
                                            <option value="E/F">Eksik/Fazla</option>
                                        </select>
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <select style={inputStyle} value={item.saleId || ""} onChange={e => updateItem(index, 'saleId', e.target.value)} disabled={item.type !== 'Tahsilat'}>
                                            <option value="">Seçiniz / Bağımsız...</option>
                                            {debts.map(d => <option key={d.saleId} value={d.saleId}>{d.receiptNo} - {d.customerName} (Borç: {d.remainingAmount}₺)</option>)}
                                        </select>
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <select style={inputStyle} value={item.paymentMethodId} onChange={e => updateItem(index, 'paymentMethodId', e.target.value)}>
                                            <option value="">Seçiniz...</option>
                                            {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                        </select>
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <select style={{ ...inputStyle, fontWeight: 'bold' }} value={item.currency} onChange={e => updateItem(index, 'currency', e.target.value)}>
                                            <option value="TL">TL ₺</option><option value="USD">USD $</option><option value="EUR">EUR €</option><option value="GBP">GBP £</option>
                                        </select>
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <input type="number" style={{ ...inputStyle, textAlign: 'right' }} value={item.originalAmount || ""} onChange={e => updateItem(index, 'originalAmount', e.target.value)} />
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <input type="number" disabled={item.currency === 'TL'} style={{ ...inputStyle, textAlign: 'right', backgroundColor: item.currency === 'TL' ? '#e9ecef' : '#fff', fontWeight: 'bold' }} value={item.amount || ""} onChange={e => updateItem(index, 'amount', e.target.value)} />
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <input type="text" style={inputStyle} value={item.description} onChange={e => updateItem(index, 'description', e.target.value)} />
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'center' }}>
                                        <button onClick={() => removeRow(index)} style={{ color: '#e74c3c', border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr><td colSpan={8} style={{ padding: '10px' }}><button onClick={addRow} className="btn btn-primary" style={{ width: '100%', padding: '8px' }}>+ Yeni Satır Ekle</button></td></tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PaymentEdit;