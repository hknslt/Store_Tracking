// src/pages/stores/StoreList.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom"; // useNavigate eklendi
import { getStores } from "../../services/storeService";
import type { Store } from "../../types";

const StoreList = () => {
    const [stores, setStores] = useState<Store[]>([]);
    const navigate = useNavigate(); // Hook

    useEffect(() => {
        getStores().then(setStores);
    }, []);

    // Dashboard'a git
    const goToDashboard = (id: string) => {
        navigate(`/stores/${id}`);
    };

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
                            <th style={{ width: '100px' }}>İşlem</th>
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
                                    <button
                                        onClick={() => goToDashboard(s.id!)}
                                        className="btn btn-sm btn-info"
                                    >
                                        Yönet ➜
                                    </button>
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