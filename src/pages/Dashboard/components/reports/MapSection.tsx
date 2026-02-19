import { motion } from "framer-motion";
import TurkeyMap from "../../../../components/TurkeyMap";
import CupIcon from "../../../../assets/icons/cup.svg";

interface CityStats {
    count: number;
    revenue: number;
}

interface Props {
    cityData: Record<string, CityStats>;
}

const MapSection = ({ cityData }: Props) => {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '25px', height: '500px', marginBottom: '80px' }}>
            {/* SOL: Harita */}
            <motion.div
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                style={{ backgroundColor: 'white', borderRadius: '16px', padding: '0', boxShadow: '0 4px 15px rgba(67, 89, 113, 0.05)', position: 'relative', overflow: 'hidden', border: '1px solid #eceef1' }}
            >
                <TurkeyMap cityData={cityData} />
            </motion.div>

            {/* SAĞ: Şehir Listesi (Leaderboard) */}
            <motion.div
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                style={{ backgroundColor: 'white', borderRadius: '16px', padding: '25px', boxShadow: '0 4px 15px rgba(67, 89, 113, 0.05)', border: '1px solid #eceef1', display: 'flex', flexDirection: 'column' }}
            >
                <h3 style={{ margin: '0 0 20px 0', fontSize: '15px', color: '#32475c', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}><img src={CupIcon} alt="" style={{ width: '18px', height: '18px', filter: 'brightness(0) saturate(100%) invert(32%) sepia(84%) saturate(1257%) hue-rotate(345deg) brightness(96%) contrast(87%)' }} /></span> En Yüksek Ciro (Top 5)
                </h3>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {Object.entries(cityData).length > 0 ? (
                        Object.entries(cityData)
                            .sort(([, a], [, b]) => b.revenue - a.revenue)
                            .slice(0, 5)
                            .map(([city, data], idx) => (
                                <div key={city} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '24px', height: '24px', borderRadius: '6px',
                                            backgroundColor: idx === 0 ? '#ffac2f' : idx === 1 ? '#b7beca' : idx === 2 ? '#cd7f32' : '#e3e6ed',
                                            color: idx > 2 ? '#697a8d' : 'white',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold'
                                        }}>
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#32475c' }}>{city}</div>
                                            <div style={{ fontSize: '11px', color: '#8592a3' }}>{data.count} Mağaza</div>
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: '700', color: '#696cff', fontSize: '13px' }}>
                                        {new Intl.NumberFormat('tr-TR', { notation: "compact", compactDisplay: "short", maximumFractionDigits: 1 }).format(data.revenue)} ₺
                                    </div>
                                </div>
                            ))
                    ) : (
                        <div style={{ textAlign: 'center', color: '#8592a3', fontSize: '13px', marginTop: '50px' }}>Veri bulunamadı.</div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default MapSection;