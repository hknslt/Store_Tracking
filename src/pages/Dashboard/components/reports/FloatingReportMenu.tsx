import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// İKONLAR (SVG)
import chartIcon from "../../../../assets/icons/trend-up.svg";
import walletIcon from "../../../../assets/icons/wallet.svg";
import boxIcon from "../../../../assets/icons/boxes.svg";
import userIcon from "../../../../assets/icons/users.svg";
import storeIcon from "../../../../assets/icons/store.svg";
import awardIcon from "../../../../assets/icons/cup.svg";

const FloatingReportMenu = () => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false); // Menü açık/kapalı durumu

    const modules = [
        { id: 'finance', title: 'Finans', icon: walletIcon, path: '/reports/finance', color: '#696cff' },
        { id: 'sales', title: 'Satış', icon: chartIcon, path: '/reports/sales', color: '#03c3ec' },
        { id: 'stock', title: 'Stok', icon: boxIcon, path: '/reports/stocks', color: '#ff3e1d' },
        { id: 'personnel', title: 'Personel', icon: awardIcon, path: '/reports/personnel', color: '#71dd37' },
        { id: 'compare', title: 'Mağazalar', icon: storeIcon, path: '/reports/compare', color: '#8592a3' },
    ];

    return (
        <div style={{
            position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
            zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center'
        }}>
            
            {/* AÇILAN MENÜ İÇERİĞİ */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        style={{
                            display: 'flex', gap: '15px', padding: '15px 20px',
                            backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)',
                            borderRadius: '20px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                            border: '1px solid rgba(255,255,255,0.5)', marginBottom: '15px'
                        }}
                    >
                        {modules.map((mod) => (
                            <motion.div
                                key={mod.id}
                                whileHover={{ scale: 1.1, y: -5 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate(mod.path)}
                                style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                                    cursor: 'pointer', minWidth: '60px'
                                }}
                            >
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '14px',
                                    backgroundColor: mod.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: `0 4px 10px ${mod.color}50`
                                }}>
                                    <img src={mod.icon} width="22" style={{ filter: 'brightness(0) invert(1)' }} />
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: '600', color: '#475569' }}>{mod.title}</span>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ANA TETİKLEYİCİ BUTON (DOCK TOGGLE) */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                    backgroundColor: '#1e293b', color: 'white',
                    border: 'none', borderRadius: '30px',
                    padding: '12px 24px', fontSize: '14px', fontWeight: '700',
                    boxShadow: '0 8px 25px rgba(30, 41, 59, 0.3)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                }}
            >
                {isOpen ? '✕ Kapat' : 'Raporlara Git'}
            </motion.button>
        </div>
    );
};

export default FloatingReportMenu;