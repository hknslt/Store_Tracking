// src/components/sales/SalesGridView.tsx
import React, { useState } from 'react';
import type { Sale } from '../../types';

// İKONLAR
const Icons = {
    user: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
    calendar: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
    receipt: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
    chevronDown: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>,
    chevronUp: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>,
    box: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
};

interface Props {
    sales: Sale[];
    formatDate: (date: string) => string;
    goToDetail: (sale: Sale) => void;
    //   YENİ PROPLAR (İsimleri almak için)
    getCatName: (id?: string) => string;
    getCushionName: (id?: string) => string;
    getColorName: (id?: string) => string;
    getDimensionName: (id?: string | null) => string;
}

const SalesGridView: React.FC<Props> = ({ 
    sales, formatDate, goToDetail, 
    getCatName, getCushionName, getColorName, getDimensionName 
}) => {
    
    const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

    const toggleCard = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {sales.length > 0 ? sales.map(s => {
                const isCanceled = (s as any).status === 'İptal';
                const itemsTotal = s.items.reduce((acc, item) => acc + ((item.price - (item.discount || 0)) * item.quantity), 0);
                const isExpanded = expandedCards[s.id!] || false;
                
                return (
                    <div 
                        key={s.id} 
                        style={{ 
                            backgroundColor: isCanceled ? '#fff1f2' : 'white', 
                            borderRadius: '12px', 
                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)', 
                            border: '1px solid #e2e8f0',
                            position: 'relative',
                            transition: 'all 0.2s',
                            opacity: isCanceled ? 0.8 : 1,
                            overflow: 'hidden'
                        }}
                    >
                        {/* ÜST KISIM (Tıklanabilir) */}
                        <div onClick={() => goToDetail(s)} style={{ padding: '20px', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '15px', color: '#1e293b', display:'flex', alignItems:'center', gap:'6px' }}>
                                        {Icons.user} {s.customerName}
                                    </h4>
                                    <div style={{ fontSize: '12px', color: '#64748b', marginTop:'4px', display:'flex', alignItems:'center', gap:'6px' }}>
                                        {Icons.receipt} {s.receiptNo}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: '800', fontSize:'16px', color: isCanceled ? '#999' : '#16a34a' }}>{itemsTotal.toFixed(2)} ₺</div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{formatDate(s.date)}</div>
                                </div>
                            </div>

                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                <div style={{ padding:'6px 10px', background:'#fff7ed', borderRadius:'6px', border:'1px solid #ffedd5', display:'flex', alignItems:'center', gap:'6px', fontSize:'11px', color:'#c2410c', fontWeight:'600' }}>
                                    {Icons.calendar} Termin: {formatDate(s.deadline)}
                                </div>
                                <div style={{ fontSize:'11px', color:'#64748b', display:'flex', alignItems:'center', gap:'4px' }}>
                                    {Icons.box} {s.items.length} Kalem
                                </div>
                            </div>

                            {isCanceled && (
                                <div style={{ 
                                    position: 'absolute', top: '15px', right: '15px', 
                                    border: '2px solid #e11d48', color: '#e11d48', 
                                    padding: '4px 10px', borderRadius: '4px', 
                                    fontWeight: 'bold', fontSize: '11px', 
                                    transform: 'rotate(-10deg)', backgroundColor:'white' 
                                }}>
                                    İPTAL EDİLDİ
                                </div>
                            )}
                        </div>

                        {/* ALT KISIM (Ürün Listesi - Tablo Görünümlü) */}
                        <div style={{ borderTop: '1px solid #e2e8f0', backgroundColor:'#f8fafc' }}>
                            <button 
                                onClick={(e) => toggleCard(e, s.id!)}
                                style={{ 
                                    width:'100%', padding:'10px', border:'none', background:'transparent', 
                                    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', 
                                    gap:'6px', fontSize:'12px', color:'#475569', fontWeight:'600'
                                }}
                            >
                                {isExpanded ? <>{Icons.chevronUp} Gizle</> : <>{Icons.chevronDown} Ürünleri Göster ({s.items.length})</>}
                            </button>

                            {isExpanded && (
                                <div style={{ padding: '0', animation: 'fadeIn 0.2s ease-in', borderTop:'1px solid #e2e8f0' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#f1f5f9', color: '#64748b', textAlign: 'left' }}>
                                                <th style={{ padding: '8px 12px', fontWeight: '600' }}>Ürün</th>
                                                <th style={{ padding: '8px 12px', fontWeight: '600' }}>Renk/Minder</th>
                                                <th style={{ padding: '8px 12px', textAlign:'center', fontWeight: '600' }}>Adet</th>
                                                <th style={{ padding: '8px 12px', textAlign:'right', fontWeight: '600' }}>Fiyat</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {s.items.map((item, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: 'white' }}>
                                                    <td style={{ padding: '8px 12px', color:'#334155' }}>
                                                        <div style={{ fontWeight: '600' }}>{item.productName.split('-')[0]}</div>
                                                        {item.dimensionId && <div style={{ color: '#e67e22', fontSize:'11px' }}>{getDimensionName(item.dimensionId)}</div>}
                                                        <div style={{ color: '#94a3b8', fontSize:'11px' }}>{getCatName(item.categoryId)}</div>
                                                        {item.productNote && <div style={{ fontStyle:'italic', color:'#777', fontSize:'11px' }}>Not: {item.productNote}</div>}
                                                    </td>
                                                    <td style={{ padding: '8px 12px', color:'#475569' }}>
                                                        <div>{getColorName(item.colorId)}</div>
                                                        <div style={{ fontSize:'11px', color:'#94a3b8' }}>{getCushionName(item.cushionId)}</div>
                                                    </td>
                                                    <td style={{ padding: '8px 12px', textAlign:'center', fontWeight:'bold' }}>
                                                        {item.quantity}
                                                    </td>
                                                    <td style={{ padding: '8px 12px', textAlign:'right', fontWeight:'600', color: isCanceled ? '#999' : '#1e293b' }}>
                                                        {item.price} ₺
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                );
            }) : (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#999' }}>Kayıt bulunamadı.</div>
            )}
        </div>
    );
};

export default SalesGridView;