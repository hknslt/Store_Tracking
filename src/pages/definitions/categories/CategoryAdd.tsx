// src/pages/definitions/categories/CategoryAdd.tsx
import { useState, useEffect } from "react";
import { addCategory, getGroups } from "../../../services/definitionService";
import type { Group } from "../../../types";

const CategoryAdd = () => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState("");
    const [categoryName, setCategoryName] = useState("");

    // Mesaj state'i
    const [message, setMessage] = useState("");

    useEffect(() => {
        getGroups().then(setGroups);
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGroupId || !categoryName) return;

        try {
            await addCategory({
                groupId: selectedGroupId,
                categoryName: categoryName
            });

            // ALERT YOK, Mesaj Var
            setMessage("✅ Kategori eklendi!");
            setCategoryName(""); // Sadece ismi temizle, grup kalsın

            setTimeout(() => setMessage(""), 2000);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div style={{ maxWidth: '500px' }}>
            <h2>Yeni Kategori Tanımla</h2>

            {/* Mesaj Kutusu */}
            {message && <div style={successStyle}>{message}</div>}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                    <label>Bağlı Olduğu Grup:</label>
                    <select
                        value={selectedGroupId}
                        onChange={e => setSelectedGroupId(e.target.value)}
                        style={inputStyle}
                    >
                        <option value="">-- Grup Seçiniz --</option>
                        {groups.map(g => (
                            <option key={g.id} value={g.id}>{g.groupName}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label>Kategori Adı:</label>
                    <input
                        type="text"
                        placeholder="Kategori Adı"
                        value={categoryName}
                        onChange={e => setCategoryName(e.target.value)}
                        style={inputStyle}
                    />
                </div>

                <button type="submit" style={buttonStyle}>Kaydet ve Yeni Ekle</button>
            </form>
        </div>
    );
};

const inputStyle = { width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #ccc' };
const buttonStyle = { padding: '12px', backgroundColor: '#e67e22', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' };
const successStyle = { padding: '10px', backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb', borderRadius: '5px', marginBottom: '10px' };

export default CategoryAdd;