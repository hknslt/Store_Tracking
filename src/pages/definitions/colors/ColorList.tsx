// src/pages/definitions/colors/ColorList.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getColors } from "../../../services/definitionService";
import type { Color } from "../../../types";

const ColorList = () => {
    const [colors, setColors] = useState<Color[]>([]);

    useEffect(() => {
        getColors().then(setColors);
    }, []);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Tanımlı Renkler</h2>
                <Link to="/definitions/colors/add" style={btnStyle}>+ Yeni Renk</Link>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                <thead>
                    <tr style={{ backgroundColor: '#ecf0f1', textAlign: 'left' }}>
                        <th style={{ padding: '10px' }}>Renk Adı</th>
                    </tr>
                </thead>
                <tbody>
                    {colors.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '10px' }}>{c.colorName}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const btnStyle = { padding: '10px 15px', backgroundColor: '#e74c3c', color: 'white', textDecoration: 'none', borderRadius: '5px' };

export default ColorList;