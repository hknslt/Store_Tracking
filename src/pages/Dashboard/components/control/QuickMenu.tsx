
import salesIcon from "../../../../assets/icons/cart-shopping-fast.svg";
import cartIcon from "../../../../assets/icons/inbox-in.svg";
import stockIcon from "../../../../assets/icons/boxes.svg";

const QuickMenu = ({ navigate }: { navigate: any }) => {
    return (
        <div className="card" style={{ padding: '20px' }}>
            <h4 style={{ margin: '0 0 15px 0', fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Hızlı Denetim</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button onClick={() => navigate('/purchases')} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 15px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', transition: 'all 0.2s', fontWeight: '600', color: '#1e293b', textAlign: 'left', fontSize: '13px' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#f59e0b'} onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                    <img src={cartIcon} width="20" alt="Alış" style={{ filter: 'invert(60%) sepia(90%) saturate(1000%) hue-rotate(350deg)' }} />
                    Alış (Tedarik) Listesi
                </button>

                <button onClick={() => navigate('/store-stocks')} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 15px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', transition: 'all 0.2s', fontWeight: '600', color: '#1e293b', textAlign: 'left', fontSize: '13px' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#10b981'} onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                    <img src={stockIcon} width="20" alt="Stok" style={{ filter: 'invert(50%) sepia(80%) saturate(1500%) hue-rotate(100deg)' }} />
                    Mağaza Stok Envanteri
                </button>

                <button onClick={() => navigate('/sales')} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 15px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', transition: 'all 0.2s', fontWeight: '600', color: '#1e293b', textAlign: 'left', fontSize: '13px' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'} onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                    <img src={salesIcon} width="20" alt="Satış" style={{ filter: 'invert(40%) sepia(80%) saturate(2000%) hue-rotate(200deg)' }} />
                    Satış Fişleri Denetimi
                </button>
            </div>
        </div>
    );
};

export default QuickMenu;