// src/pages/stores/StoreList.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getStores } from "../../services/storeService";
import type { Store } from "../../types";

const StoreList = () => {
    const [stores, setStores] = useState<Store[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        getStores().then(setStores);
    }, []);

    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Mağazalar</h2>
                <Link to="/stores/add" className="btn btn-primary">+ Yeni Mağaza</Link>
            </div>

            <div className="card">
                <table className="data-table">
                    <thead>
                        <tr style={{ backgroundColor: '#f8f9fa', textAlign: 'left' }}>
                            <th style={{ padding: '12px' }}>Kod</th>
                            <th style={{ padding: '12px' }}>Mağaza Adı</th>
                            <th style={{ padding: '12px' }}>Telefon</th>
                            <th style={{ padding: '12px' }}>Adres</th>
                            <th style={{ width: '180px', textAlign: 'center' }}>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stores.map(s => (
                            <tr key={s.id} className="hover-row">
                                <td style={{ padding: '12px', fontWeight: 'bold' }}>{s.storeCode}</td>
                                <td style={{ padding: '12px' }}>{s.storeName}</td>
                                <td style={{ padding: '12px' }}>{s.phone}</td>
                                <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>{s.address}</td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                        {/* YÖNET (Dashboard) */}
                                        <button onClick={() => navigate(`/stores/${s.id}`)} className="btn btn-sm btn-info" style={{ padding: '6px 12px' }}>
                                            Yönet
                                        </button>
                                        {/* DÜZENLE */}
                                        <button onClick={() => navigate(`/stores/edit/${s.id}`)} className="btn btn-sm btn-warning" style={{ backgroundColor: '#f59e0b', color: 'white', padding: '6px 12px' }}>
                                            Düzenle
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StoreList;