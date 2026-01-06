// src/pages/personnel/PersonnelList.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAllPersonnel, getStores } from "../../services/storeService";
import type { Personnel, Store } from "../../types";

const PersonnelList = () => {
    const [personnel, setPersonnel] = useState<Personnel[]>([]);
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

    const getStoreName = (id: string) => {
        const s = stores.find(x => x.id === id);
        return s ? s.storeName : "-";
    };

    const getRoleName = (role: string) => {
        switch(role) {
            case 'admin': return 'Süper Admin';
            case 'store_admin': return 'Mağaza Müdürü';
            case 'staff': return 'Personel';
            default: return role;
        }
    };

    if (loading) return <p>Yükleniyor...</p>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Personel Listesi</h2>
                <Link to="/personnel/add" style={{ padding: '10px 15px', backgroundColor: '#2980b9', color: 'white', textDecoration: 'none', borderRadius: '5px' }}>+ Yeni Personel</Link>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
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
                        <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '12px' }}><b>{p.fullName}</b></td>
                            <td style={{ padding: '12px' }}>{getStoreName(p.storeId)}</td>
                            <td style={{ padding: '12px' }}>{getRoleName(p.role)}</td>
                            <td style={{ padding: '12px' }}>{p.phone}</td>
                            <td style={{ padding: '12px' }}>{p.startDate}</td>
                            <td style={{ padding: '12px' }}>
                                <span style={{
                                    padding: '4px 8px', borderRadius: '4px',
                                    backgroundColor: p.isActive ? '#d4edda' : '#f8d7da',
                                    color: p.isActive ? '#155724' : '#721c24',
                                    fontSize: '12px', fontWeight: 'bold'
                                }}>
                                    {p.isActive ? "AKTİF" : "PASİF"}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default PersonnelList;