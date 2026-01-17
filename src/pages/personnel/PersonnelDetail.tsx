// src/pages/personnel/PersonnelDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { getStores } from "../../services/storeService";
import type { Personnel, SystemUser } from "../../types";
import "../../App.css";

const PersonnelDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [person, setPerson] = useState<Personnel | SystemUser | null>(null);
    const [storeName, setStoreName] = useState("-");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDetail = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, "personnel", id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const pData = { id: docSnap.id, ...docSnap.data() } as (Personnel | SystemUser);
                    setPerson(pData);

                    if ('storeId' in pData && pData.storeId) {
                        const sData = await getStores();
                        const s = sData.find(x => x.id === pData.storeId);
                        if (s) setStoreName(s.storeName);
                    }
                } else {
                    alert("Personel bulunamadı.");
                    navigate("/personnel");
                }
            } catch (error) { console.error(error); } finally { setLoading(false); }
        };
        loadDetail();
    }, [id, navigate]);

    const getRoleName = (role: string) => {
        switch (role) {
            case 'admin': return 'Süper Admin';
            case 'store_admin': return 'Mağaza Müdürü';
            case 'staff': return 'Personel';
            case 'control': return 'Kontrol';
            default: return role;
        }
    };

    if (loading) return <div className="page-container" style={{ textAlign: 'center', paddingTop: '100px' }}>Yükleniyor...</div>;
    if (!person) return <div className="page-container">Kayıt yok.</div>;

    return (
        <div className="page-container">
            {/* --- MODERN HEADER --- */}
            <div className="modern-header">
                <div>
                    <h2>Personel Kartı</h2>
                    <p>Çalışan detay bilgileri</p>
                </div>
                {/* 👇 BUTON DÜZELTİLDİ */}
                <button onClick={() => navigate(-1)} className="modern-btn btn-secondary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '5px' }}><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Listeye Dön
                </button>
            </div>

            {/* PROFİL KARTI */}
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '30px', alignItems: 'start' }}>

                {/* SOL: ÖZET KART */}
                <div className="card" style={{ padding: '30px', textAlign: 'center' }}>
                    <div style={{
                        width: '100px', height: '100px', borderRadius: '50%',
                        background: '#e0e7ff', color: '#4f46e5',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '40px', fontWeight: 'bold', margin: '0 auto 20px auto'
                    }}>
                        {person.fullName.charAt(0).toUpperCase()}
                    </div>

                    <h3 style={{ margin: '0 0 5px 0', color: '#1e293b' }}>{person.fullName}</h3>
                    <p style={{ color: '#64748b', margin: 0 }}>{getRoleName(person.role)}</p>

                    <div style={{ marginTop: '20px' }}>
                        <span className={`status-badge ${person.isActive ? 'success' : 'danger'}`} style={{ padding: '8px 20px' }}>
                            {person.isActive ? "AKTİF PERSONEL" : "PASİF"}
                        </span>
                    </div>
                </div>

                {/* SAĞ: DETAYLI BİLGİLER */}
                <div className="card" style={{ padding: '30px' }}>
                    <h4 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginTop: 0, color: '#334155' }}>Kimlik & İletişim</h4>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                        <div>
                            <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>TELEFON</label>
                            <div style={{ fontSize: '15px', fontWeight: '500', color: '#1e293b' }}>{person.phone || "-"}</div>
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>MAĞAZA</label>
                            <div style={{ fontSize: '15px', fontWeight: '500', color: '#4f46e5' }}>{storeName}</div>
                        </div>
                    </div>

                    <h4 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', color: '#334155' }}>Diğer Bilgiler</h4>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>İŞE GİRİŞ TARİHİ</label>
                            <div style={{ fontSize: '15px', fontWeight: '500', color: '#1e293b' }}>
                                {('startDate' in person) ? new Date(person.startDate).toLocaleDateString('tr-TR') : '-'}
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>ADRES</label>
                            <div style={{ fontSize: '15px', fontWeight: '500', color: '#1e293b' }}>
                                {('address' in person) ? person.address : '-'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PersonnelDetail;