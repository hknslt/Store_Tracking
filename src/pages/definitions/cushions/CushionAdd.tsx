import { useState } from "react";
import { addCushion } from "../../../services/definitionService";

const CushionAdd = () => {
    const [cushionName, setCushionName] = useState("");
    const [message, setMessage] = useState("");

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cushionName) return 
        try {
            await addCushion({ cushionName });
            setMessage("✅ Minder tipi eklendi!");
            setCushionName("");
            setTimeout(() => setMessage(""), 2000);
        } catch (error) {
            alert("Hata oluştu.");
        }
    };

    return (
        <div style={{ maxWidth: '500px' }}>
            <h2>Yeni Minder Tipi Tanımla</h2>
            {message && <div style={successStyle}>{message}</div>}
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input 
                    type="text" 
                    placeholder="Minder Tipi Adı..." 
                    value={cushionName} 
                    onChange={e => setCushionName(e.target.value)}
                    style={inputStyle}
                    autoFocus
                />
                <button type="submit" style={buttonStyle}>Kaydet ve Yeni Ekle</button>
            </form>
        </div>
    );
};
const inputStyle = { width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #ccc' };
const buttonStyle = { padding: '12px', backgroundColor: '#8e44ad', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' };
const successStyle = { padding: '10px', backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb', borderRadius: '5px', marginBottom: '10px' };
export default CushionAdd;