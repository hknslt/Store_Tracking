import { useState } from "react";
import { addDimension } from "../../../services/definitionService";

const DimensionAdd = () => {
    const [dimensionName, setDimensionName] = useState("");
    const [message, setMessage] = useState("");

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dimensionName) return 
        try {
            await addDimension({ dimensionName });
            setMessage("✅ Ebat eklendi!");
            setDimensionName("");
            setTimeout(() => setMessage(""), 2000);
        } catch (error) {
            alert("Hata oluştu.");
        }
    };

    return (
        <div style={{ maxWidth: '500px' }}>
            <h2>Yeni Ebat Tanımla</h2>
            {message && <div style={successStyle}>{message}</div>}
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input 
                    type="text" 
                    placeholder="Ebat Giriniz..." 
                    value={dimensionName} 
                    onChange={e => setDimensionName(e.target.value)}
                    style={inputStyle}
                    autoFocus
                />
                <button type="submit" style={buttonStyle}>Kaydet ve Yeni Ekle</button>
            </form>
        </div>
    );
};
// Stiller aynı (Kopyalayabilirsin)
const inputStyle = { width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #ccc' };
const buttonStyle = { padding: '12px', backgroundColor: '#16a085', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' };
const successStyle = { padding: '10px', backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb', borderRadius: '5px', marginBottom: '10px' };
export default DimensionAdd;