    // src/components/sales/SalesTableView.tsx
    import React from 'react';
    import type { Sale, DeliveryStatus } from '../../types';

    // İKONLAR (SVG)
    const Icons = {
        check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
        cross: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
        search: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
        clock: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
    };

    interface Props {
        sales: Sale[];
        toggleRow: (id: string) => void;
        expandedRowId: string | null;
        rowStockStatus: Record<string, number>;
        formatDate: (date: string) => string;
        handleStatusClick: (sale: Sale, idx: number, status: DeliveryStatus) => void;
        isAdmin: boolean;
        openCancelModal: (id: string) => void;
        goToDetail: (sale: Sale) => void;
        getCatName: (id?: string) => string;
        getCushionName: (id?: string) => string;
        getColorName: (id?: string) => string;
        getDimensionName: (id?: string | null) => string;
    }

    const SalesTableView: React.FC<Props> = ({
        sales, toggleRow, expandedRowId, rowStockStatus, formatDate,
        handleStatusClick, isAdmin, openCancelModal, goToDetail,
        getCatName, getCushionName, getColorName, getDimensionName
    }) => {
        return (
            <table className="data-table">
                <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                        <th style={{ width: '5%', textAlign: 'center' }}>Drm</th>
                        <th style={{ width: '10%' }}>Tarih</th>
                        <th style={{ width: '12%' }}>Fiş No</th>
                        <th style={{ width: '18%' }}>Müşteri Adı</th>
                        <th style={{ width: '15%' }}>Termin Tarihi</th>
                        <th style={{ width: '12%' }}>Personel</th>
                        <th style={{ width: '13%', textAlign: 'right' }}>Toplam</th>
                    </tr>
                </thead>
                <tbody>
                    {sales.length > 0 ? sales.map(s => {
                        const itemsTotal = s.items.reduce((acc, item) => acc + ((item.price - (item.discount || 0)) * item.quantity), 0);
                        const isAllDelivered = s.items.every(i => i.deliveryStatus === 'Teslim Edildi');
                        const isCanceled = (s as any).status === 'İptal';

                        return (
                            <React.Fragment key={s.id}>
                                <tr
                                    onClick={() => s.id && toggleRow(s.id)}
                                    className="hover-row"
                                    style={{
                                        cursor: 'pointer',
                                        backgroundColor: expandedRowId === s.id ? '#f0fdf4' : (isCanceled ? '#fff1f2' : 'white'),
                                        opacity: isCanceled ? 0.6 : 1,
                                        borderBottom: expandedRowId === s.id ? 'none' : '1px solid #eee'
                                    }}
                                >
                                    <td style={{ textAlign: 'center' }}>
                                        {isCanceled ? (
                                            <span className="badge" style={{ backgroundColor: '#e11d48', color: 'white', fontSize: '10px' }}>İPTAL</span>
                                        ) : (
                                            isAllDelivered
                                                ? <span style={{ color: '#16a34a', display: 'flex', justifyContent: 'center' }}>{Icons.check}</span>
                                                : <span style={{ color: '#f59e0b', display: 'flex', justifyContent: 'center' }}>{Icons.clock}</span>
                                        )}
                                    </td>
                                    <td style={{ textDecoration: isCanceled ? 'line-through' : 'none' }}>{formatDate(s.date)}</td>
                                    <td style={{ fontWeight: '600', color: '#2c3e50', textDecoration: isCanceled ? 'line-through' : 'none' }}>{s.receiptNo}</td>
                                    <td style={{ fontWeight: '500' }}>{s.customerName}</td>
                                    <td style={{
                                        color: isCanceled ? '#999' : (new Date(s.deadline) < new Date() && !isAllDelivered ? '#dc2626' : '#d97706'),
                                        fontWeight: '600'
                                    }}>
                                        {formatDate(s.deadline)}
                                    </td>
                                    <td>{s.personnelName}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: isCanceled ? '#999' : '#16a34a' }}>
                                        {isCanceled ? '0.00 ₺' : itemsTotal.toFixed(2) + ' ₺'}
                                    </td>
                                </tr>

                                {expandedRowId === s.id && (
                                    <tr style={{ backgroundColor: '#fbfbfb', borderBottom: '2px solid #ddd' }}>
                                        <td colSpan={7} style={{ padding: '20px' }}>
                                            <div style={{ padding: '15px', border: '1px solid #eee', borderRadius: '8px', backgroundColor: 'white', marginBottom: '10px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <div>
                                                        <div style={{ marginBottom: '5px' }}><strong>Tel:</strong> {s.phone} <span style={{ margin: '0 10px', color: '#ccc' }}>|</span> <strong>Adres:</strong> {s.address}</div>
                                                        {s.explanation && (
                                                            <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '6px', color: '#92400e', fontSize: '13px' }}>
                                                                <strong>Not:</strong> {s.explanation}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '10px' }}>
                                                        <button onClick={(e) => { e.stopPropagation(); goToDetail(s); }} className="btn btn-sm btn-info" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                            {Icons.search} Detay
                                                        </button>
                                                        {isAdmin && !isCanceled && !isAllDelivered && (
                                                            <button onClick={(e) => { e.stopPropagation(); openCancelModal(s.id!); }} className="btn btn-sm" style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                {Icons.cross} İptal Et
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <table className="data-table dense" style={{ border: '1px solid #eee', backgroundColor: 'white' }}>
                                                <thead>
                                                    <tr style={{ backgroundColor: '#f1f2f6' }}>
                                                        <th style={{ width: '25%' }}>Ürün</th>
                                                        <th style={{ width: '10%' }}>Renk</th>
                                                        <th style={{ width: '10%' }}>Minder</th>
                                                        <th style={{ width: '15%' }}>Not</th>
                                                        <th style={{ textAlign: 'center', width: '5%' }}>Adet</th>
                                                        <th style={{ textAlign: 'right', width: '10%' }}>Fiyat</th>
                                                        <th style={{ textAlign: 'center', width: '10%' }}>Temin</th>
                                                        <th style={{ width: '140px', textAlign: 'center' }}>İşlem</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {s.items.map((item, idx) => {
                                                        const uniqueId = `${item.productId}_${item.colorId}_${item.dimensionId || 'null'}`;
                                                        const availableReserved = rowStockStatus[uniqueId] || 0;
                                                        const isArrived = availableReserved >= item.quantity;
                                                        const isDelivered = item.deliveryStatus === 'Teslim Edildi';
                                                        const isActionEnabled = !isCanceled && !isDelivered && (item.supplyMethod === 'Stoktan' || isArrived);

                                                        return (
                                                            <tr key={idx} style={{ backgroundColor: isDelivered ? '#fdfdfd' : 'inherit' }}>
                                                                <td style={{ padding: '8px' }}>
                                                                    <span style={{ fontWeight: '600', color: '#34495e', marginRight: '6px' }}>{item.productName.split('-')[0].trim()}</span>
                                                                    {item.dimensionId && <span style={{ color: '#e67e22', fontWeight: '600', marginRight: '6px' }}>{getDimensionName(item.dimensionId)}</span>}
                                                                    <span style={{ color: '#95a5a6', fontSize: '12px' }}>({getCatName(item.categoryId)})</span>
                                                                </td>
                                                                <td>{getColorName(item.colorId)}</td>
                                                                <td>{getCushionName(item.cushionId)}</td>
                                                                <td style={{ fontStyle: 'italic', color: '#777' }}>{item.productNote || "-"}</td>
                                                                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                                                                <td style={{ textAlign: 'right' }}>{item.price} ₺</td>
                                                                <td style={{ textAlign: 'center' }}>
                                                                    <span className="badge" style={{ fontSize: '10px', backgroundColor: isDelivered ? '#ecf0f1' : (item.supplyMethod === 'Stoktan' ? '#d4edda' : (isArrived ? '#d4edda' : '#f8d7da')), color: isDelivered ? '#777' : (item.supplyMethod === 'Stoktan' || isArrived ? '#155724' : '#721c24') }}>
                                                                        {item.supplyMethod === 'Stoktan' ? 'Stoktan' : (isArrived ? 'Merkez' : 'Merkez')}
                                                                    </span>
                                                                </td>
                                                                <td style={{ textAlign: 'center' }}>
                                                                    <button
                                                                        onClick={() => handleStatusClick(s, idx, item.deliveryStatus!)}
                                                                        disabled={!isActionEnabled}
                                                                        className={`btn ${isDelivered ? 'btn-secondary' : 'btn-primary'}`}
                                                                        style={{ width: '100%', padding: '5px 8px', fontSize: '11px', opacity: isActionEnabled ? 1 : 0.6, cursor: isActionEnabled ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                                                                    >
                                                                        {isDelivered ? <>{Icons.check} Teslim Edildi</> : (isCanceled ? 'İptal' : 'Teslim Et')}
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
                        <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#999' }}>Kayıt bulunamadı.</td></tr>
                    )}
                </tbody>
            </table>
        );
    };

    export default SalesTableView;