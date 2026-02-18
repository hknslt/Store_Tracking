// src/components/purchases/PurchasesTableView.tsx
import React from 'react';
import type { Purchase, PurchaseStatus } from '../../types';

const Icons = {
    check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
    cross: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
    search: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
    clock: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
    edit: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
};

interface Props {
    purchases: Purchase[];
    toggleRow: (id: string) => void;
    expandedRowId: string | null;
    formatDate: (date: string) => string;
    handleStatusClick: (id: string, idx: number, status: PurchaseStatus) => void;
    getButtonText: (s: PurchaseStatus) => string;
    getButtonColor: (s: PurchaseStatus) => string;
    isAdmin: boolean;
    setCancelModal: (val: { show: boolean, id: string | null }) => void;
    goToDetail: (purchase: Purchase) => void;
    onEdit: (purchase: Purchase) => void;
    getCatName: (id?: string) => string;
    getCushionName: (id?: string) => string;
    getColorName: (id?: string) => string;
    getDimensionName: (id?: string | null) => string;
}

const PurchasesTableView: React.FC<Props> = ({
    purchases, toggleRow, expandedRowId, formatDate,
    handleStatusClick, getButtonText, getButtonColor, isAdmin, setCancelModal, goToDetail, onEdit,
    getCatName, getCushionName, getColorName, getDimensionName
}) => {
    return (
        <table className="data-table">
            <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ width: '5%', textAlign: 'center' }}>Drm</th>
                    <th style={{ width: '10%' }}>Tarih</th>
                    <th style={{ width: '15%' }}>Fiş No</th>
                    <th style={{ width: '12%', textAlign: 'center' }}>Çeşit</th>
                    <th style={{ width: '15%' }}>Personel</th>
                    <th style={{ width: '13%', textAlign: 'right' }}>Tutar</th>
                </tr>
            </thead>
            <tbody>
                {purchases.length > 0 ? purchases.map(p => {
                    const isAllCompleted = p.items.every(item => item.status === 'Tamamlandı');
                    const isCanceled = p.items.every(item => item.status === 'İptal');

                    // Fişin içinde 'Beklemede' veya 'İptal' dışında (yani sürece girmiş) bir ürün var mı?
                    const isEditable = !isCanceled && !isAllCompleted && p.items.every(i => i.status === 'Beklemede' || i.status === 'İptal' || i.status === 'Tamamlandı');

                    return (
                        <React.Fragment key={p.id}>
                            <tr className="hover-row" onClick={() => p.id && toggleRow(p.id)} style={{ cursor: 'pointer', borderBottom: expandedRowId === p.id ? 'none' : '1px solid #eee', opacity: isCanceled ? 0.6 : 1, backgroundColor: expandedRowId === p.id ? '#f0fdf4' : 'white' }}>

                                <td style={{ textAlign: 'center', fontSize: '18px' }}>
                                    {isCanceled ? <span className="badge" style={{ backgroundColor: '#e11d48', color: 'white', fontSize: '10px' }}>İPTAL</span> : (isAllCompleted ? <span style={{ color: '#27ae60' }}>●</span> : <span style={{ color: '#e74c3c' }}>●</span>)}
                                </td>
                                <td>{formatDate(p.date)}</td>
                                <td style={{ fontWeight: '600', textDecoration: isCanceled ? 'line-through' : 'none' }}>{p.receiptNo}</td>
                                <td style={{ textAlign: 'center' }}>{p.items.length}</td>
                                <td>{p.personnelName}</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{p.totalAmount} ₺</td>
                            </tr>

                            {expandedRowId === p.id && (
                                <tr style={{ backgroundColor: '#fbfbfb', borderBottom: '2px solid #ddd' }}>
                                    <td colSpan={6} style={{ padding: '20px' }}>
                                        <div style={{ textAlign: 'right', marginBottom: '10px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>

                                            {/* 🔥 DÜZENLEME BUTONU: Sadece "Beklemede" durumundaysa görünür */}
                                            {isAdmin && isEditable && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onEdit(p); }}
                                                    className="btn btn-sm"
                                                    style={{ backgroundColor: '#e0f2fe', color: '#0284c7', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', gap: '5px' }}
                                                >
                                                    {Icons.edit} Düzenle
                                                </button>
                                            )}

                                            {isAdmin && !isCanceled && !isAllCompleted && (
                                                <button onClick={(e) => { e.stopPropagation(); setCancelModal({ show: true, id: p.id! }); }} className="btn btn-sm btn-warning" style={{ backgroundColor: '#f39c12' }}>İptal Et</button>
                                            )}

                                            <button onClick={(e) => { e.stopPropagation(); goToDetail(p); }} className="btn btn-sm btn-info">🔍 Detay</button>
                                        </div>

                                        <table className="data-table dense" style={{ border: '1px solid #eee', backgroundColor: 'white' }}>
                                            <thead>
                                                <tr style={{ backgroundColor: '#f1f2f6' }}>
                                                    <th style={{ width: '30%' }}>Ürün Bilgisi</th>
                                                    <th style={{ width: '10%' }}>Renk</th>
                                                    <th style={{ width: '10%' }}>Minder</th>
                                                    <th style={{ width: '15%' }}>Açıklama</th>
                                                    <th style={{ textAlign: 'center' }}>Adet</th>
                                                    <th style={{ width: '120px', textAlign: 'center' }}>Durum</th>
                                                    <th style={{ width: '140px', textAlign: 'center' }}>İşlem</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {p.items.map((item, idx) => {
                                                    // 🔥 MAĞAZA İÇİN BUTON KİLİDİ:
                                                    // Kullanıcı Admin/Control DEĞİLSE ve ürün "Sevkiyat" aşamasında DEĞİLSE buton kilitlenir.
                                                    // Ürün zaten "Tamamlandı" veya "İptal" ise buton her türlü kilitlenir.
                                                    const isProcessFinished = item.status === 'Tamamlandı' || item.status === 'İptal';
                                                    const isStoreLocked = !isAdmin && item.status !== 'Sevkiyat';
                                                    const isButtonDisabled = isProcessFinished || isStoreLocked;

                                                    return (
                                                        <tr key={idx} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                                            <td style={{ padding: '8px' }}>
                                                                <span style={{ fontWeight: '600', color: '#34495e', marginRight: '6px' }}>{item.productName.split('-')[0].trim()}</span>
                                                                {item.dimensionId && <span style={{ color: '#e67e22', fontWeight: '600', marginRight: '6px' }}>{getDimensionName(item.dimensionId)}</span>}
                                                                <span style={{ color: '#95a5a6', fontSize: '12px' }}>({getCatName(item.categoryId)})</span>
                                                            </td>
                                                            <td>{getColorName(item.colorId)}</td>
                                                            <td>{getCushionName(item.cushionId)}</td>
                                                            <td style={{ color: '#777', fontStyle: 'italic' }}>{item.explanation || "-"}</td>
                                                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <span className="badge" style={{ backgroundColor: '#ecf0f1', color: '#34495e', fontSize: '11px' }}>{item.status}</span>
                                                            </td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <button
                                                                    onClick={() => !isButtonDisabled && handleStatusClick(p.id!, idx, item.status)}
                                                                    disabled={isButtonDisabled}
                                                                    className={`btn ${getButtonColor(item.status)}`}
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '4px 8px',
                                                                        fontSize: '11px',
                                                                        opacity: isButtonDisabled ? 0.5 : 1,
                                                                        cursor: isButtonDisabled ? 'not-allowed' : 'pointer'
                                                                    }}
                                                                    title={isStoreLocked ? "Bu aşamaya müdahale yetkiniz yok" : ""}
                                                                >
                                                                    {getButtonText(item.status)}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    );
                }) : (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Bu kriterlere uygun kayıt bulunamadı.</td></tr>
                )}
            </tbody>
        </table>
    );
};

export default PurchasesTableView;