// src/pages/prices/PriceList.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPriceLists, deletePriceList } from "../../services/priceService";
import { getStores } from "../../services/storeService";
import type { Store, PriceListModel } from "../../types";
import "../../App.css";

const PriceList = () => {
  const navigate = useNavigate();
  const [priceLists, setPriceLists] = useState<PriceListModel[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  // --- KENDİ MESAJ VE MODAL STATE'LERİMİZ ---
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [listToDelete, setListToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [lists, sData] = await Promise.all([getPriceLists(), getStores()]);
      setPriceLists(lists);
      setStores(sData);
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: "Veriler yüklenirken hata oluştu." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // SİLME BUTONUNA BASILDIĞINDA MODALI AÇ
  const handleDeleteClick = (id: string) => {
    setListToDelete(id);
    setShowDeleteModal(true);
  };

  // MODALDAN "EVET" DENİLDİĞİNDE ÇALIŞACAK FONKSİYON
  const confirmDelete = async () => {
    if (!listToDelete) return;
    try {
      await deletePriceList(listToDelete);
      setMessage({ type: 'success', text: "✅ Fiyat listesi başarıyla silindi." });
      loadData(); // Listeyi yenile
    } catch (error) {
      setMessage({ type: 'error', text: "Silme işlemi sırasında bir hata oluştu." });
    } finally {
      setShowDeleteModal(false);
      setListToDelete(null);
    }
  };

  // Mağaza ID'lerini isimlere çeviren yardımcı fonksiyon
  const getStoreNames = (storeIds: string[]) => {
    if (!storeIds || storeIds.length === 0) return "Hiçbir Mağaza Seçilmedi";
    return storeIds.map(id => stores.find(s => s.id === id)?.storeName || "Bilinmeyen").join(", ");
  };

  if (loading) return <div className="page-container">Yükleniyor...</div>;

  // Modal Stilleri
  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
  };
  const modalContentStyle: React.CSSProperties = {
    backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '350px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
  };

  return (
    <div className="page-container">

      {/* TOAST MESAJI */}
      {message && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
          padding: '15px 25px', borderRadius: '8px', color: 'white',
          fontWeight: '600', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          backgroundColor: message.type === 'success' ? '#10b981' : '#ef4444',
          animation: 'fadeIn 0.3s ease-in-out'
        }}>
          {message.text}
        </div>
      )}

      {/* SİLME ONAY MODALI */}
      {showDeleteModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ margin: '0 0 10px 0', color: '#dc2626' }}>🗑️ Listeyi Sil?</h3>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
              Bu fiyat listesini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setShowDeleteModal(false)} className="modern-btn btn-secondary">Vazgeç</button>
              <button onClick={confirmDelete} className="modern-btn" style={{ backgroundColor: '#dc2626', color: 'white', border: 'none' }}>Evet, Sil</button>
            </div>
          </div>
        </div>
      )}

      <div className="modern-header">
        <div>
          <h2>Fiyat Listeleri Yönetimi</h2>
          <p>Sistemde tanımlı tüm toptan ve perakende fiyat listeleri.</p>
        </div>
        <button onClick={() => navigate('/prices/manage')} className="modern-btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          + Yeni Fiyat Listesi Oluştur
        </button>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <table className="modern-table">
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={{ width: '25%' }}>Liste Adı</th>
                <th style={{ width: '15%' }}>Tür</th>
                <th style={{ width: '35%' }}>Kullanılan Mağazalar</th>
                <th style={{ width: '25%', textAlign: 'right' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {priceLists.length > 0 ? (
                priceLists.map(list => (
                  <tr key={list.id} className="hover-row">
                    {/* 🔥 Liste Adı Tıklanabilir Yapıldı */}
                    <td
                      style={{ fontWeight: '700', color: '#3b82f6', cursor: 'pointer' }}
                      onClick={() => navigate(`/prices/detail/${list.id}`)}
                    >
                      {list.name}
                    </td>
                    <td>
                      <span className={`status-badge ${list.type === 'toptan' ? 'warning' : 'success'}`}>
                        {list.type === 'toptan' ? 'Toptan' : 'Perakende'}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px', color: '#64748b' }}>
                      {getStoreNames(list.storeIds)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => navigate(`/prices/detail/${list.id}`)} className="modern-btn" style={{ padding: '6px 12px', fontSize: '12px', marginRight: '8px', background: '#e0f2fe', color: '#0284c7', border: 'none', cursor: 'pointer', display: 'inline-block' }}>
                        🔍 Detay
                      </button>
                      <button onClick={() => navigate(`/prices/manage/${list.id}`)} className="modern-btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', marginRight: '8px', display: 'inline-block' }}>
                        ✏️ Düzenle
                      </button>
                      <button onClick={() => handleDeleteClick(list.id!)} className="modern-btn" style={{ padding: '6px 12px', fontSize: '12px', background: '#fee2e2', color: '#dc2626', border: 'none', cursor: 'pointer' }}>
                        🗑️ Sil
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    Henüz oluşturulmuş bir fiyat listesi yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PriceList;