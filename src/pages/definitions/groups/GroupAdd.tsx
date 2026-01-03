// src/pages/definitions/groups/GroupAdd.tsx
import { useState } from "react";
import { addGroup } from "../../../services/definitionService";

const GroupAdd = () => {
    // const navigate = useNavigate(); // Yönlendirmeyi kapattık
    const [groupName, setGroupName] = useState("");
    const [message, setMessage] = useState("");

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!groupName) return;

        try {
            await addGroup({ groupName });
            setMessage("✅ Grup başarıyla eklendi!");
            setGroupName("");
            setTimeout(() => {
                setMessage("");
            }, 2000);



        } catch (error) {
            alert("Hata oluştu.");
        }
    };

    return (
        <div style={{ maxWidth: '500px' }}>
            <h2>Yeni Grup Tanımla</h2>
            {message && <div style={successStyle}>{message}</div>}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                    <label>Grup Adı:</label>
                    <input
                        type="text"
                        placeholder="Grup Adı"
                        value={groupName}
                        onChange={e => setGroupName(e.target.value)}
                        style={inputStyle}
                        autoFocus
                    />
                </div>

                <button type="submit" style={buttonStyle}>Kaydet</button>
            </form>
        </div>
    );
};

const inputStyle = { width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #ccc' };
const buttonStyle = { padding: '12px', backgroundColor: '#8e44ad', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' };
const successStyle = {
    padding: '10px',
    backgroundColor: '#d4edda',
    color: '#155724',
    border: '1px solid #c3e6cb',
    borderRadius: '5px',
    marginBottom: '10px'
};



export default GroupAdd;