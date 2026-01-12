// src/pages/ssh/SSHList.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { getStores } from "../../services/storeService";
import { getSSHRecordsByStore } from "../../services/sshService";

import type { Store, SSHRecord, Personnel } from "../../types";
import "../../App.css";

const SSHList = () => {
    const { currentUser } = useAuth();
    const [records, setRecords] = useState<SSHRecord[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            if (!currentUser) return;
            const sData = await getStores();
            setStores(sData);

            const userDoc = await getDoc(doc(db, "personnel", currentUser.uid));
            if (userDoc.exists()) {
                const u = userDoc.data() as Personnel;
                if (u.role === 'admin') { setIsAdmin(true); }
                else { setIsAdmin(false); setSelectedStoreId(u.storeId); }
            }
        };
        init();
    }, [currentUser]);

    useEffect(() => {
        if (selectedStoreId) {
            getSSHRecordsByStore(selectedStoreId).then(setRecords);
        }
    }, [selectedStoreId]);

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="page-title">
                    <h2>SSH Listesi</h2>
                    <p>Teknik servis kayıtları</p>
                </div>
                <Link to="/ssh/add" className="btn btn-primary">+ Yeni SSH Kaydı</Link>
            </div>

            {isAdmin && (
                <div className="card" style={{marginBottom:'15px', padding:'15px'}}>
                    <select className="form-input" value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)} style={{maxWidth:'300px'}}>
                        <option value="">-- Mağaza Seçiniz --</option>
                        {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                    </select>
                </div>
            )}

            <div className="card">
                <div className="card-body" style={{padding:0}}>
                    <table className="data-table">
                        <thead>
                            <tr style={{backgroundColor:'#f8f9fa'}}>
                                <th style={{width:'5%'}}></th>
                                <th>Tarih</th>
                                <th>Müşteri</th>
                                <th>Fiş No</th>
                                <th>Sevkiyat</th>
                                <th>Tutar</th>
                                <th>Durum</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map(rec => (
                                <>
                                    <tr key={rec.id} onClick={() => setExpandedRow(expandedRow === rec.id ? null : rec.id!)} className="hover-row" style={{cursor:'pointer'}}>
                                        <td style={{textAlign:'center', color:'#3498db'}}>{expandedRow === rec.id ? '▼' : '▶'}</td>
                                        <td>{new Date(rec.createdAt).toLocaleDateString()}</td>
                                        <td style={{fontWeight:'bold'}}>{rec.customerName}</td>
                                        <td>{rec.saleReceiptNo}</td>
                                        <td>{rec.shippingMethod}</td>
                                        <td>{rec.totalCost} ₺</td>
                                        <td>
                                            <span className="badge" style={{backgroundColor: rec.status === 'Açık' ? '#fcf3cf' : '#d4edda', color: rec.status === 'Açık' ? '#f39c12' : '#27ae60'}}>
                                                {rec.status}
                                            </span>
                                        </td>
                                    </tr>
                                    {expandedRow === rec.id && (
                                        <tr style={{backgroundColor:'#fbfbfb'}}>
                                            <td colSpan={7} style={{padding:'20px'}}>
                                                <table className="data-table dense" style={{border:'1px solid #eee', background:'white'}}>
                                                    <thead>
                                                        <tr><th>Yapılan İşlem</th><th style={{textAlign:'right'}}>Tutar</th></tr>
                                                    </thead>
                                                    <tbody>
                                                        {rec.items.map((item, i) => (
                                                            <tr key={i}>
                                                                <td>{item.description}</td>
                                                                <td style={{textAlign:'right'}}>{item.price} ₺</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SSHList;