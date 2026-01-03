import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCushions } from "../../../services/definitionService";
import type { Cushion } from "../../../types";

const CushionList = () => {
    const [cushions, setCushions] = useState<Cushion[]>([]);
    useEffect(() => { getCushions().then(setCushions); }, []);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Tanımlı Minder Tipleri</h2>
                <Link to="/definitions/cushions/add" style={btnStyle}>+ Yeni Minder</Link>
            </div>
            <ul style={{ listStyle: 'none', padding: 0 }}>
                {cushions.map(c => (
                    <li key={c.id} style={{ padding: '10px', borderBottom: '1px solid #eee', backgroundColor: 'white' }}>
                        {c.cushionName}
                    </li>
                ))}
            </ul>
        </div>
    );
};
const btnStyle = { padding: '10px 15px', backgroundColor: '#8e44ad', color: 'white', textDecoration: 'none', borderRadius: '5px' };
export default CushionList;