import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDimensions } from "../../../services/definitionService";
import type { Dimension } from "../../../types";

const DimensionList = () => {
    const [dimensions, setDimensions] = useState<Dimension[]>([]);
    useEffect(() => { getDimensions().then(setDimensions); }, []);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Tanımlı Ebatlar</h2>
                <Link to="/definitions/dimensions/add" style={btnStyle}>+ Yeni Ebat</Link>
            </div>
            <ul style={{ listStyle: 'none', padding: 0 }}>
                {dimensions.map(d => (
                    <li key={d.id} style={{ padding: '10px', borderBottom: '1px solid #eee', backgroundColor: 'white' }}>
                        {d.dimensionName}
                    </li>
                ))}
            </ul>
        </div>
    );
};
const btnStyle = { padding: '10px 15px', backgroundColor: '#16a085', color: 'white', textDecoration: 'none', borderRadius: '5px' };
export default DimensionList;