import { motion } from "framer-motion";
import chartIcon from "../../../../assets/icons/trend-up.svg";
import walletIcon from "../../../../assets/icons/wallet.svg";
import boxIcon from "../../../../assets/icons/boxes.svg";
import userIcon from "../../../../assets/icons/users.svg";

interface Props {
    stats: {
        totalRevenue: number;
        salesCount: number;
        stockValue: number;
        personnelCount: number;
    };
}

const KpiGrid = ({ stats }: Props) => {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '25px' }}>
            <CompactKpi title="Toplam Ciro" value={`${stats.totalRevenue.toLocaleString('tr-TR')} ₺`} icon={walletIcon} color="#696cff" bg="#e7e7ff" trend="+4.5%" />
            <CompactKpi title="Satış Adedi" value={stats.salesCount} icon={chartIcon} color="#03c3ec" bg="#d7f5fc" trend="+12%" />
            <CompactKpi title="Stok Değeri" value={`~${stats.stockValue.toLocaleString()} ₺`} icon={boxIcon} color="#ff3e1d" bg="#ffe0db" trend="Sabit" />
            <CompactKpi title="Personel" value={stats.personnelCount} icon={userIcon} color="#71dd37" bg="#e8fadf" trend="Aktif" />
        </div>
    );
};

const CompactKpi = ({ title, value, icon, color, bg, trend }: any) => (
    <motion.div
        whileHover={{ y: -2 }}
        style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 6px rgba(67, 89, 113, 0.04)', border: '1px solid #eceef1' }}
    >
        <div>
            <span style={{ fontSize: '12px', color: '#8592a3', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>{title}</span>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#32475c', margin: 0 }}>{value}</h3>
            {trend && <span style={{ fontSize: '11px', color: color, fontWeight: '600', marginTop: '2px', display: 'block' }}>{trend}</span>}
        </div>
        <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={icon} width="20" style={{ filter: `drop-shadow(0 0 0 ${color})` }} />
        </div>
    </motion.div>
);

export default KpiGrid;