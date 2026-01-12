// src/pages/ssh/SSHAdd.tsx
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { getStores } from "../../services/storeService";
import { getSalesByStore } from "../../services/saleService";
import { addSSHRecord } from "../../services/sshService";

import type { Store, Sale, SSHItem, SSHRecord, Personnel } from "../../types";
import "../../App.css";

const SSHAdd = () => {
    const { currentUser } = useAuth();

    // Veriler
    const [stores, setStores] = useState<Store[]>([]);
    const [allSales, setAllSales] = useState<Sale[]>([]);
    const [filteredSales, setFilteredSales] = useState<Sale[]>([]);

    // Form State
    const [selectedStoreId, setSelectedStoreId] = useState("");
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

    // Arama State
    const [searchTerm, setSearchTerm] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    const [sshItems, setSshItems] = useState<SSHItem[]>([]);
    const [currentItem, setCurrentItem] = useState<SSHItem>({ description: "", price: 0 });
    const [shippingMethod, setShippingMethod] = useState("Mağazadan Teslim");

    const [isAdmin, setIsAdmin] = useState(false);

    // Mesaj State (Alert yerine)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const showToast = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    // --- BAŞLANGIÇ ---
    useEffect(() => {
        const init = async () => {
            if (!currentUser) return;
            const sData = await getStores();
            setStores(sData);

            const userDoc = await getDoc(doc(db, "personnel", currentUser.uid));
            if (userDoc.exists()) {
                const u = userDoc.data() as Personnel;
                if (u.role === 'admin') { setIsAdmin(true); }
                else {
                    setIsAdmin(false);
                    setSelectedStoreId(u.storeId);
                }
            }
        };
        init();

        const handleClickOutside = (event: any) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);

    }, [currentUser]);

    // --- MAĞAZA SEÇİLİNCE ---
    useEffect(() => {
        if (selectedStoreId) {
            getSalesByStore(selectedStoreId).then(data => {
                setAllSales(data);
            });
        } else {
            setAllSales([]);
        }
        setSelectedSale(null);
        setSearchTerm("");
    }, [selectedStoreId]);

    // --- ARAMA ---
    useEffect(() => {
        if (searchTerm.trim() === "") {
            setFilteredSales([]);
            return;
        }
        const lowerTerm = searchTerm.toLowerCase();
        const results = allSales.filter(s =>
            s.receiptNo.toLowerCase().includes(lowerTerm) ||
            s.customerName.toLowerCase().includes(lowerTerm)
        );
        setFilteredSales(results);
    }, [searchTerm, allSales]);

    const handleSelectSale = (sale: Sale) => {
        setSelectedSale(sale);
        setSearchTerm(`${sale.receiptNo} - ${sale.customerName}`);
        setShowSuggestions(false);
    };

    const clearSelection = () => {
        setSelectedSale(null);
        setSearchTerm("");
        setFilteredSales([]);
    };

    // --- İŞLEM EKLEME ---
    const addItem = () => {
        if (!currentItem.description) {
            showToast('error', "İşlem açıklaması giriniz.");
            return;
        }
        setSshItems([...sshItems, currentItem]);
        setCurrentItem({ description: "", price: 0 });
    };

    // --- KAYDET ---
    const handleSave = async () => {
        if (!selectedStoreId || !selectedSale) {
            showToast('error', "Mağaza ve Fiş seçilmelidir.");
            return;
        }
        if (sshItems.length === 0) {
            showToast('error', "En az bir işlem giriniz.");
            return;
        }

        const record: SSHRecord = {
            storeId: selectedStoreId,
            saleId: selectedSale.id!,
            saleReceiptNo: selectedSale.receiptNo,
            customerName: selectedSale.customerName,
            phone: selectedSale.phone,
            items: sshItems,
            totalCost: sshItems.reduce((acc, item) => acc + Number(item.price), 0),
            shippingMethod: shippingMethod,
            status: 'Açık',
            createdAt: new Date().toISOString()
        };

        try {
            await addSSHRecord(record);
            showToast('success', "SSH Kaydı başarıyla oluşturuldu!");
            setSshItems([]);
            clearSelection();
        } catch (error) {
            showToast('error', "Kayıt sırasında bir hata oluştu.");
        }
    };

    return (
        <div className="page-container">
            {/* MESAJ BİLDİRİMİ */}
            {message && (
                <div className={`toast-message ${message.type === 'success' ? 'toast-success' : 'toast-error'}`}>
                    {message.text}
                </div>
            )}

            <div className="page-header">
                <div className="page-title">
                    <h2>SSH Kaydı Oluştur</h2>
                    <p>Satış sonrası teknik servis ve tadilat işlemleri</p>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '15px', padding: '15px', overflow: 'visible' }}>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px' }}>
                    <div>
                        <label className="form-label">Mağaza</label>
                        {isAdmin ? (
                            <select className="form-input" value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)}>
                                <option value="">Seçiniz...</option>
                                {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                            </select>
                        ) : (
                            <input disabled value="Mağazam" className="form-input" />
                        )}
                    </div>

                    {/* FİŞ ARAMA ALANI */}
                    <div style={{ position: 'relative' }} ref={searchRef}>
                        <label className="form-label">Fiş No veya Müşteri Ara</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Örn: 2024-001 veya Ahmet..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setShowSuggestions(true);
                                    if (selectedSale) setSelectedSale(null);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                disabled={!selectedStoreId}
                            />
                            {searchTerm && (
                                <button
                                    onClick={clearSelection}
                                    style={{
                                        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '16px'
                                    }}
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* ÖNERİ LİSTESİ */}
                        {showSuggestions && filteredSales.length > 0 && (
                            <ul style={{
                                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                                backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '0 0 4px 4px',
                                maxHeight: '250px', overflowY: 'auto', listStyle: 'none', padding: 0, margin: 0,
                                boxShadow: '0 10px 15px rgba(0,0,0,0.1)'
                            }}>
                                {filteredSales.map(sale => (
                                    <li
                                        key={sale.id}
                                        onClick={() => handleSelectSale(sale)}
                                        style={{
                                            padding: '12px', borderBottom: '1px solid #eee', cursor: 'pointer',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                    >
                                        <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>{sale.receiptNo}</div>
                                        <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                                            {sale.customerName} - {new Date(sale.date).toLocaleDateString()}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {showSuggestions && searchTerm && filteredSales.length === 0 && (
                            <div style={{
                                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                                backgroundColor: 'white', border: '1px solid #ddd', padding: '10px', color: '#999'
                            }}>
                                Kayıt bulunamadı.
                            </div>
                        )}
                    </div>
                </div>

                {selectedSale && (
                    <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#eaf2f8', borderRadius: '5px', borderLeft: '4px solid #3498db', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                        <div>
                            <span style={{ fontSize: '12px', color: '#7f8c8d', display: 'block' }}>Satış Tarihi</span>
                            <strong>{new Date(selectedSale.date).toLocaleDateString()}</strong>
                        </div>
                        <div>
                            <span style={{ fontSize: '12px', color: '#7f8c8d', display: 'block' }}>Müşteri Adı</span>
                            <strong>{selectedSale.customerName}</strong>
                        </div>
                        <div>
                            <span style={{ fontSize: '12px', color: '#7f8c8d', display: 'block' }}>Telefon</span>
                            <strong>{selectedSale.phone}</strong>
                        </div>
                    </div>
                )}
            </div>

            {selectedSale && (
                <div className="card">
                    <div className="card-header"><h3>Yapılacak İşlemler</h3></div>
                    <div className="card-body" style={{ padding: '10px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr auto', gap: '10px', marginBottom: '15px' }}>
                            <input
                                type="text" className="form-input"
                                placeholder="İşlem Açıklaması (Örn: Kumaş değişimi)"
                                value={currentItem.description}
                                onChange={e => setCurrentItem({ ...currentItem, description: e.target.value })}
                            />
                            <input
                                type="number" className="form-input"
                                placeholder="Tutar (0 olabilir)"
                                value={currentItem.price}
                                onChange={e => setCurrentItem({ ...currentItem, price: Number(e.target.value) })}
                            />
                            <button onClick={addItem} className="btn btn-primary">Ekle</button>
                        </div>

                        <table className="data-table">
                            <thead>
                                <tr style={{ backgroundColor: '#f9f9f9' }}>
                                    <th>Açıklama</th>
                                    <th style={{ width: '150px', textAlign: 'right' }}>Tutar</th>
                                    <th style={{ width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {sshItems.map((item, idx) => (
                                    <tr key={idx}>
                                        <td>{item.description}</td>
                                        <td style={{ textAlign: 'right' }}>{item.price} ₺</td>
                                        <td><button onClick={() => setSshItems(sshItems.filter((_, i) => i !== idx))} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Sil</button></td>
                                    </tr>
                                ))}
                                {sshItems.length > 0 && (
                                    <tr style={{ backgroundColor: '#f1f1f1', fontWeight: 'bold' }}>
                                        <td style={{ textAlign: 'right' }}>TOPLAM:</td>
                                        <td style={{ textAlign: 'right' }}>{sshItems.reduce((a, b) => a + b.price, 0)} ₺</td>
                                        <td></td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <label style={{ fontWeight: 'bold' }}>Sevkiyat Yöntemi:</label>
                                <select className="form-input" value={shippingMethod} onChange={e => setShippingMethod(e.target.value)} style={{ width: '200px' }}>
                                    <option value="Mağazadan Teslim">Mağazadan Teslim</option>
                                    <option value="Servis Ekibi (Eve)">Servis Ekibi (Eve)</option>
                                    <option value="Kargo">Kargo</option>
                                    <option value="Nakliye">Nakliye</option>
                                </select>
                            </div>
                            <button onClick={handleSave} className="btn btn-success" style={{ padding: '10px 30px', fontSize: '16px' }}>SSH Fişini Oluştur</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SSHAdd;