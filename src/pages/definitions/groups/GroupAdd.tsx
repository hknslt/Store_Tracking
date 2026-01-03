// src/pages/definitions/groups/GroupAdd.tsx
import { useState } from "react";
import { addGroup } from "../../../services/definitionService";

const GroupAdd = () => {
    // const navigate = useNavigate(); // Yönlendirmeyi kapattık
    const [groupName, setGroupName] = useState("");

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!groupName) return alert("Grup adını yazınız!");

        try {
            await addGroup({ groupName });

            // 1. Kullanıcıya bilgi ver
            alert("✅ Grup eklendi! Sıradakini yazabilirsiniz.");

            // 2. Kutucuğu temizle (En önemli kısım burası)
            setGroupName("");

            // 3. navigate komutunu SİLDİK. Artık sayfada kalacak.

        } catch (error) {
            alert("Hata oluştu.");
        }
    };

    return (
        <div style={{ maxWidth: '500px' }}>
            <h2>Yeni Grup Tanımla</h2>
            <div style={{ marginBottom: '10px', fontSize: '14px', color: '#666' }}>
                Buradan arka arkaya grup ekleyebilirsiniz.
            </div>

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

export default GroupAdd;