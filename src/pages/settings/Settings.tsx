// src/pages/settings/Settings.tsx
import { useNavigate } from "react-router-dom";
import "../../App.css";
import userIcon from "../../assets/icons/users.svg";
import addIcon from "../../assets/icons/user-add.svg";
import deviceIcon from "../../assets/icons/laptop.svg"; // Cihazlar için
import shieldIcon from "../../assets/icons/shield.svg"; // Güvenlik başlığı için
import listIcon from "../../assets/icons/square.svg";   // Sistem başlığı için
import folderIcon from "../../assets/icons/folder.svg";
import paletteIcon from "../../assets/icons/palette.svg";
import rulerIcon from "../../assets/icons/ruler.svg";
import sofaIcon from "../../assets/icons/sofa.svg";
import cardIcon from "../../assets/icons/credit-card.svg";

const Settings = () => {
  const navigate = useNavigate();

  // Menü Kartları İçin Veri Yapısı (Emojiler SVG değişkenleri ile değiştirildi)
  const settingModules = [
    {
      category: "Kullanıcı & Güvenlik",
      icon: shieldIcon,
      items: [
        { title: "Kullanıcı Yönetimi", desc: "Sistemdeki tüm yöneticileri ve yetkilerini düzenleyin.", icon: userIcon, path: "/admin/users", color: "#3b82f6" },
        { title: "Yeni Kullanıcı Ekle", desc: "Sisteme yeni bir mağaza veya admin hesabı oluşturun.", icon: addIcon, path: "/register", color: "#10b981" },
        { title: "Cihaz Erişim Kontrolü", desc: "Hangi bilgisayarların sisteme girebileceğini yönetin.", icon: deviceIcon, path: "/admin/devices", color: "#f59e0b" },
      ]
    },
    {
      category: "Sistem Tanımlamaları",
      icon: listIcon,
      items: [
        { title: "Ürün Grupları", desc: "Ana kategorileri ve alt kategorileri düzenleyin.", icon: folderIcon, path: "/definitions/general", color: "#6366f1" },
        { title: "Renk Tanımları", desc: "Sistemde kullanılacak ürün renklerini belirleyin.", icon: paletteIcon, path: "/definitions/colors", color: "#ec4899" },
        { title: "Ebat Tanımları", desc: "Ürünlere ait ölçü ve ebat standartlarını girin.", icon: rulerIcon, path: "/definitions/dimensions", color: "#14b8a6" },
        { title: "Minder Tanımları", desc: "Minder türleri ve özelliklerini yönetin.", icon: sofaIcon, path: "/definitions/cushions", color: "#8b5cf6" },
        { title: "Ödeme Yöntemleri", desc: "Kasa işlemlerindeki ödeme tiplerini ayarlayın.", icon: cardIcon, path: "/definitions/payment-methods", color: "#f97316" },
      ]
    }
  ];

  return (
    <div className="page-container">
      <div className="modern-header" style={{ marginBottom: '30px' }}>
        <div>
          <h2>Sistem Ayarları</h2>
          <p style={{ color: '#64748b' }}>Tüm yönetim modüllerine, tanımlamalara ve güvenlik ayarlarına buradan ulaşabilirsiniz.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

        {/* KATEGORİZE EDİLMİŞ AYAR KARTLARI */}
        {settingModules.map((module, mIndex) => (
          <div key={mIndex}>

            {/* BAŞLIK VE KATEGORİ İKONU */}
            <h3 style={{ fontSize: '18px', color: '#1e293b', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src={module.icon} alt="" style={{ width: '22px', height: '22px', opacity: 0.7 }} />
              {module.category}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {module.items.map((item, iIndex) => (
                <div
                  key={iIndex}
                  onClick={() => navigate(item.path)}
                  className="card hover-row"
                  style={{
                    padding: '20px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '15px',
                    transition: 'all 0.2s', border: '1px solid #e2e8f0', borderLeft: `4px solid ${item.color}`
                  }}
                >

                  {/* MODÜL İKONU (SVG) */}
                  <div style={{
                    backgroundColor: `${item.color}15`,
                    width: '60px', height: '60px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '12px', flexShrink: 0
                  }}>
                    <img
                      src={item.icon}
                      alt={item.title}
                      style={{
                        width: '28px',
                        height: '28px',
                        /* SVG'yi item.color rengine boyamak için CSS filter tekniği (İsteğe bağlı, siyah da kalabilir) */
                        opacity: 0.8
                      }}
                    />
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 5px 0', fontSize: '15px', color: '#1e293b' }}>{item.title}</h4>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.4' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Settings;