// src/pages/Settings.tsx
import { useState } from "react";

const Settings = () => {
  const [generalSettings,] = useState({
    siteName: "Bahçemo Yönetim Paneli",
    currency: "TRY",
    taxRate: 20
  });

  return (
    <div className="page-container">
      <h2 className="page-title">Genel Ayarlar</h2>
      
      <div className="card" style={{maxWidth: '600px'}}>
        <div className="form-group" style={{marginBottom:'15px'}}>
            <label style={{display:'block', marginBottom:'5px', fontWeight:'600'}}>Uygulama Adı</label>
            <input 
                type="text" 
                value={generalSettings.siteName} 
                className="form-input" 
                readOnly 
                style={{width: '100%', padding:'10px', borderRadius:'5px', border:'1px solid #ddd'}}
            />
        </div>

        <button className="btn btn-primary" style={{padding:'10px 20px', background:'#10b981', color:'white', border:'none', borderRadius:'5px', cursor:'pointer'}}>
            Ayarları Kaydet
        </button>
      </div>
    </div>
  );
};

export default Settings;