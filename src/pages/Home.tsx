// src/pages/Home.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Home = () => {
  const { userRole, userData, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Yükleme bitmediyse bekle
    if (loading) return;

    // --- SENARYO 1: MAĞAZA MÜDÜRÜ ---
    // Eğer kullanıcı 'store_admin' ise ve atanmış bir mağazası varsa,
    // direkt o mağazanın Dashboard sayfasına yönlendir.
    if (userRole === 'store_admin') {
      if (userData?.storeId) {
        navigate(`/stores/${userData.storeId}`, { replace: true });
      } else {
        // Mağaza ID'si yoksa hata ver veya uyar
        alert("Hata: Hesabınıza tanımlı bir mağaza bulunamadı. Lütfen yönetici ile görüşün.");
      }
    }

    // --- SENARYO 2: PERSONEL / SATIŞ DANIŞMANI ---
    // Eğer 'staff' ise direkt satış ekranına yönlendirebiliriz (Tercihe bağlı)
    // if (userRole === 'staff') navigate('/sales/add');

  }, [userRole, userData, loading, navigate]);

  // Yüklenirken veya yönlendirilirken boş bir şey gösterme
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>Yönlendiriliyor...</div>;

  // --- SENARYO 3: ADMIN EKRANI ---
  // Eğer buraya kadar geldiyse kullanıcı ADMIN'dir (veya yönlendirilmeyen başka bir roldür).
  // Buraya Admin için genel özet (Tüm mağazaların toplam cirosu vb.) koyabiliriz.
  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">
          <h2>Genel Yönetim Paneli</h2>
          <p>Hoşgeldiniz, {userData?.fullName}</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h3>👋 Merhaba Yönetici!</h3>
          <p>
            Sol menüden <strong>Mağazalar</strong>, <strong>Personeller</strong> veya <strong>Ürünler</strong> sayfasına giderek sistemi yönetebilirsiniz.
          </p>
          <hr />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
            {/* Buraya Admin için hızlı butonlar koyabilirsiniz */}
            <div onClick={() => navigate('/stores')} style={{ background: '#eaf2f8', padding: '20px', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '30px' }}>🏬</div>
              <strong>Mağazalar</strong>
            </div>
            <div onClick={() => navigate('/products')} style={{ background: '#eafaf1', padding: '20px', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '30px' }}>🛋️</div>
              <strong>Ürünler</strong>
            </div>
            <div onClick={() => navigate('/personnel')} style={{ background: '#fef9e7', padding: '20px', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '30px' }}>👥</div>
              <strong>Personeller</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;