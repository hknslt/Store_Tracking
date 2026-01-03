// src/pages/definitions/colors/ColorAdd.tsx
import { useState } from "react";
import { addColor } from "../../../services/definitionService";

const ColorAdd = () => {
    const [colorName, setColorName] = useState("");
    const [message, setMessage] = useState("");

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!colorName) return

        try {
            await addColor({ colorName });
            
            setMessage("✅ Renk eklendi!");
            setColorName("");
            setTimeout(() => setMessage(""), 2000);
            
        } catch (error) {
            alert("Hata oluştu.");
        }
    };

    return (
        <div style={{ maxWidth: '500px' }}>
            <h2>Yeni Renk Tanımla</h2>
            {message && <div style={successStyle}>{message}</div>}
            <div style={{ marginBottom: '15px', color: '#666', fontSize: '14px' }}>
                Ürünlerde kullanılacak renkleri buradan ekleyebilirsiniz.
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                    <label>Renk Adı:</label>
                    <input 
                        type="text" 
                        placeholder="Renk Adı" 
                        value={colorName} 
                        onChange={e => setColorName(e.target.value)}
                        style={inputStyle}
                        autoFocus
                    />
                </div>

                <button type="submit" style={buttonStyle}>Kaydet ve Yeni Ekle</button>
            </form>
        </div>
    );
};

const inputStyle = { width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #ccc' };
const buttonStyle = { padding: '12px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' };
const successStyle = { padding: '10px', backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb', borderRadius: '5px', marginBottom: '10px' };
export default ColorAdd;