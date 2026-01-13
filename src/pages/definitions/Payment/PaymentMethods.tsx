// src/pages/definitions/PaymentMethods.tsx
import { useState, useEffect } from "react";
import { addPaymentMethod, getPaymentMethods, deletePaymentMethod } from "../../../services/paymentService";
import type { PaymentMethod } from "../../../types";

const PaymentMethods = () => {
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [name, setName] = useState("");

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const data = await getPaymentMethods();
        setMethods(data);
    };

    const handleAdd = async () => {
        if (!name) return;
        await addPaymentMethod(name);
        setName("");
        loadData();
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Silmek istediğinize emin misiniz?")) {
            await deletePaymentMethod(id);
            loadData();
        }
    };

    return (
        <div className="page-container">
            <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
                <h3>Ödeme Yöntemi Tanımları</h3>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <input 
                        className="form-input" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        placeholder="Örn: Nakit, Kredi Kartı, Havale..." 
                    />
                    <button onClick={handleAdd} className="btn btn-primary">Ekle</button>
                </div>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {methods.map(m => (
                        <li key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee' }}>
                            <span>{m.name}</span>
                            <button onClick={() => handleDelete(m.id!)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Sil</button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default PaymentMethods;