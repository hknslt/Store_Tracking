// src/pages/ssh/SSHList.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { getStores } from "../../services/storeService";
import { getSSHRecordsByStore } from "../../services/sshService";
import type { Store, SSHRecord, SystemUser } from "../../types";
import "../../App.css";

const SSHList = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // Veriler
    const [allRecords, setAllRecords] = useState<SSHRecord[]>([]); // Tüm ham veri
    const [filteredRecords, setFilteredRecords] = useState<SSHRecord[]>([]); // Filtrelenmiş veri
    const [stores, setStores] = useState<Store[]>([]);

    // Filtreler
    const [selectedStoreId, setSelectedStoreId] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [showOnlyActive, setShowOnlyActive] = useState(true); // Varsayılan: Sadece Aktifler

    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const init = async () => {
            if (!currentUser) return;
            const sData = await getStores();
            setStores(sData);

            const userDoc = await getDoc(doc(db, "personnel", currentUser.uid));
            if (userDoc.exists()) {
                const u = userDoc.data() as SystemUser;
                if (['admin', 'control', 'report'].includes(u.role)) {
                    setIsAdmin(true);
                } else {
                    setIsAdmin(false);
                    if (u.storeId) setSelectedStoreId(u.storeId);
                }
            }
        };
        init();
    }, [currentUser]);

    // Verileri Çek
    useEffect(() => {
        if (selectedStoreId) {
            getSSHRecordsByStore(selectedStoreId).then(data => {
                // Varsayılan sıralama: Tarihe göre (Yeniden eskiye)
                const sorted = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setAllRecords(sorted);
            });
        } else {
            setAllRecords([]);
        }
    }, [selectedStoreId]);

    // Filtreleme Mantığı
    useEffect(() => {
        let result = allRecords;

        // 1. Durum Filtresi (Aktif/Pasif)
        if (showOnlyActive) {
            result = result.filter(r => r.status === 'Açık');
        }

        // 2. Arama Filtresi (Müşteri veya Fiş No)
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(r =>
                r.customerName.toLowerCase().includes(lowerTerm) ||
                r.saleReceiptNo.toLowerCase().includes(lowerTerm)
            );
        }

        setFilteredRecords(result);
    }, [allRecords, showOnlyActive, searchTerm]);

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="page-title">
                    <h2>SSH Listesi</h2>
                    <p>Teknik servis ve tadilat kayıtları</p>
                </div>
                <Link to="/ssh/add" className="btn btn-primary">+ Yeni Kayıt</Link>
            </div>

            {/* FİLTRE PANELİ */}
            <div className="filter-bar">
                {isAdmin ? (
                    <select className="soft-input" value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)} style={{ minWidth: '200px' }}>
                        <option value="">-- Mağaza Seçiniz --</option>
                        {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                    </select>
                ) : (
                    <div style={{ padding: '10px', fontWeight: 'bold', color: '#555' }}>
                        {stores.find(s => s.id === selectedStoreId)?.storeName}
                    </div>
                )}

                <input
                    type="text"
                    placeholder="Müşteri veya Fiş No Ara..."
                    className="soft-input"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ flex: 1 }}
                />

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                    <input
                        type="checkbox"
                        checked={showOnlyActive}
                        onChange={e => setShowOnlyActive(e.target.checked)}
                        style={{ width: '18px', height: '18px' }}
                    />
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>Sadece Aktifleri Göster</span>
                </label>
            </div>

            {/* TABLO */}
            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    <table className="data-table">
                        <thead>
                            <tr style={{ backgroundColor: '#f8f9fa' }}>
                                <th>Tarih</th>
                                <th>Müşteri</th>
                                <th>Fiş No</th>
                                <th>Sevkiyat</th>
                                <th style={{ textAlign: 'right' }}>Tutar</th>
                                <th style={{ textAlign: 'center' }}>Durum</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRecords.length > 0 ? (
                                filteredRecords.map(rec => (
                                    <tr key={rec.id} className="hover-row">
                                        <td>{new Date(rec.createdAt).toLocaleDateString()}</td>
                                        <td style={{ fontWeight: '600', color: '#2c3e50' }}>{rec.customerName}</td>
                                        <td>{rec.saleReceiptNo}</td>
                                        <td>{rec.shippingMethod}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{rec.totalCost} ₺</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`badge ${rec.status === 'Açık' ? 'badge-warning' : 'badge-success'}`}>
                                                {rec.status}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button
                                                onClick={() => navigate(`/ssh/${rec.id}`)} // Detay Sayfasına Git
                                                className="btn btn-sm btn-secondary"
                                            >
                                                Detay
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#999' }}>Kayıt bulunamadı.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SSHList;