// src/pages/personnel/PersonnelList.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAllPersonnel, getStores } from "../../services/storeService";
import type { Personnel, Store, SystemUser } from "../../types"; // SystemUser eklendi

const PersonnelList = () => {
    // TİP DÜZELTMESİ: State artık hem Personnel hem SystemUser kabul ediyor
    const [personnel, setPersonnel] = useState<(Personnel | SystemUser)[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            const [pData, sData] = await Promise.all([getAllPersonnel(), getStores()]);
            setPersonnel(pData);
            setStores(sData);
            setLoading(false);
        };
        loadData();
    }, []);

    const getStoreName = (id?: string) => {
        if (!id) return "-";
        const s = stores.find(x => x.id === id);
        return s ? s.storeName : "-";
    };

    const getRoleName = (role: string) => {
        switch (role) {
            case 'admin': return 'Süper Admin';
            case 'store_admin': return 'Mağaza Müdürü';
            case 'staff': return 'Personel';
            case 'control': return 'Kontrol';
            case 'report': return 'Rapor';
            default: return role;
        }
    };

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="page-title">
                    <h2>Personel Listesi</h2>
                </div>
                <Link to="/personnel/add" className="btn btn-primary">+ Yeni Personel</Link>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    <table className="data-table">
                        <thead>
                            <tr style={{ backgroundColor: '#ecf0f1', textAlign: 'left', color: '#555' }}>
                                <th style={{ padding: '12px' }}>Adı Soyadı</th>
                                <th style={{ padding: '12px' }}>Mağaza</th>
                                <th style={{ padding: '12px' }}>Görevi</th>
                                <th style={{ padding: '12px' }}>Telefon</th>
                                <th style={{ padding: '12px' }}>Giriş Tarihi</th>
                                <th style={{ padding: '12px' }}>Durum</th>
                            </tr>
                        </thead>
                        <tbody>
                            {personnel.map(p => (
                                <tr key={p.id} className="hover-row">
                                    <td style={{ padding: '12px', fontWeight: '600' }}>{p.fullName}</td>

                                    {/* Store ID SystemUser'da optional olabilir */}
                                    <td style={{ padding: '12px' }}>
                                        {'storeId' in p ? getStoreName(p.storeId) : '-'}
                                    </td>

                                    <td style={{ padding: '12px' }}>
                                        <span className="badge" style={{ backgroundColor: '#f0f4f8', color: '#333' }}>
                                            {getRoleName(p.role)}
                                        </span>
                                    </td>

                                    <td style={{ padding: '12px' }}>{p.phone || "-"}</td>

                                    {/* startDate kontrolü: Sadece Personnel tipinde var */}
                                    <td style={{ padding: '12px' }}>
                                        {'startDate' in p ? p.startDate : '-'}
                                    </td>

                                    <td style={{ padding: '12px' }}>
                                        <span className={`badge ${p.isActive ? 'badge-success' : 'badge-danger'}`}>
                                            {p.isActive ? "AKTİF" : "PASİF"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PersonnelList;