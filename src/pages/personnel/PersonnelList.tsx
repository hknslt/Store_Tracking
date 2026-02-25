// src/pages/personnel/PersonnelList.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAllPersonnel, getStores } from "../../services/storeService";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import type { Personnel, Store, SystemUser } from "../../types";
import "../../App.css";

const PersonnelList = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // Veriler
    const [personnel, setPersonnel] = useState<(Personnel | SystemUser)[]>([]);
    const [stores, setStores] = useState<Store[]>([]);

    // Kontroller
    const [selectedStoreId, setSelectedStoreId] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const loadData = async () => {
            if (!currentUser) return;
            try {
                const [pData, sData] = await Promise.all([getAllPersonnel(), getStores()]);
                setPersonnel(pData);
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
            } catch (error) { console.error(error); } finally { setLoading(false); }
        };
        loadData();
    }, [currentUser]);

    //   FİLTRELEME VE SIRALAMA (A-Z)
    const filteredPersonnel = personnel
        .filter(p => {
            const matchesStore = selectedStoreId ? (p as any).storeId === selectedStoreId : true;
            const matchesSearch = p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || (p.phone && p.phone.includes(searchTerm));
            return matchesStore && matchesSearch;
        })
        .sort((a, b) => a.fullName.localeCompare(b.fullName, 'tr')); // Türkçe Karakter Uyumlu A-Z Sıralama

    const getStoreName = (id?: string) => stores.find(x => x.id === id)?.storeName || "-";
    const getRoleName = (role: string) => {
        const roles: any = { 'admin': 'Süper Admin', 'store_admin': 'Mağaza Müdürü', 'staff': 'Personel', 'control': 'Kontrol' };
        return roles[role] || role;
    };

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    return (
        <div className="page-container">

            {/* 1. MODERN HEADER */}
            <div className="modern-header">
                <div>
                    <h2>Personel Listesi</h2>
                    <p style={{ color: '#64748b' }}>Mağaza çalışanları ve yetkililer</p>
                </div>
                <Link to="/personnel/add" className="modern-btn btn-primary">
                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}>+</span> Yeni Personel
                </Link>
            </div>

            {/* 2. FİLTRE BARI */}
            <div className="filter-bar">
                {isAdmin ? (
                    <select
                        className="soft-input"
                        value={selectedStoreId}
                        onChange={e => setSelectedStoreId(e.target.value)}
                        style={{ minWidth: '220px' }}
                    >
                        <option value="">-- Tüm Mağazalar --</option>
                        {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                    </select>
                ) : (
                    <div style={{ padding: '10px 20px', backgroundColor: '#e2e8f0', borderRadius: '8px', color: '#475569', fontWeight: '600', fontSize: '14px' }}>
                        {stores.find(s => s.id === selectedStoreId)?.storeName || "Mağazam"}
                    </div>
                )}

                <input
                    type="text"
                    placeholder="🔍 İsim veya Telefon ile ara..."
                    className="soft-input"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ flex: 1 }}
                />
            </div>

            {/* 3. LİSTE (Kart Görünümlü Satırlar) */}
            <div className="modern-table-container">
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th>Adı Soyadı</th>
                            <th>Mağaza</th>
                            <th>Görevi</th>
                            <th>Telefon</th>
                            <th>Giriş Tarihi</th>
                            <th style={{ textAlign: 'center' }}>Durum</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPersonnel.length > 0 ? (
                            filteredPersonnel.map(p => (
                                <tr key={p.id} className="modern-row" onClick={() => navigate(`/personnel/${p.id}`)}>
                                    <td style={{ fontWeight: '600', color: '#1e293b' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '36px', height: '36px', borderRadius: '50%',
                                                background: '#e0e7ff', color: '#4f46e5',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: 'bold', fontSize: '14px'
                                            }}>
                                                {p.fullName.charAt(0).toUpperCase()}
                                            </div>
                                            {p.fullName}
                                        </div>
                                    </td>
                                    <td style={{ color: '#475569' }}>{'storeId' in p ? getStoreName(p.storeId) : '-'}</td>
                                    <td>
                                        <span style={{ backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', color: '#475569', fontSize: '12px', fontWeight: '600' }}>
                                            {getRoleName(p.role)}
                                        </span>
                                    </td>
                                    <td style={{ color: '#475569' }}>{p.phone || "-"}</td>
                                    <td style={{ color: '#64748b' }}>
                                        {'startDate' in p ? new Date(p.startDate).toLocaleDateString('tr-TR') : '-'}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span style={{
                                            padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                                            backgroundColor: p.isActive ? '#dcfce7' : '#fee2e2',
                                            color: p.isActive ? '#166534' : '#991b1b'
                                        }}>
                                            {p.isActive ? "AKTİF" : "PASİF"}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button className="modern-btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                                            Detay
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Kayıt bulunamadı.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PersonnelList;