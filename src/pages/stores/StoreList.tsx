// src/pages/stores/StoreList.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStores } from "../../services/storeService";
import type { Store } from "../../types";

const StoreList = () => {
    const [stores, setStores] = useState<Store[]>([]);

    useEffect(() => {
        getStores().then(setStores);
    }, []);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Mağazalar</h2>
                <Link to="/stores/add" style={{ padding: '10px 15px', backgroundColor: '#8e44ad', color: 'white', textDecoration: 'none', borderRadius: '5px' }}>+ Yeni Mağaza</Link>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', textAlign: 'left' }}>
                        <th style={{ padding: '12px' }}>Kod</th>
                        <th style={{ padding: '12px' }}>Mağaza Adı</th>
                        <th style={{ padding: '12px' }}>Telefon</th>
                        <th style={{ padding: '12px' }}>Adres</th>
                    </tr>
                </thead>
                <tbody>
                    {stores.map(s => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '12px' }}><b>{s.storeCode}</b></td>
                            <td style={{ padding: '12px' }}>{s.storeName}</td>
                            <td style={{ padding: '12px' }}>{s.phone}</td>
                            <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>{s.address}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default StoreList;