// src/pages/definitions/groups/GroupList.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getGroups } from "../../../services/definitionService";
import type { Group } from "../../../types";

const GroupList = () => {
    const [groups, setGroups] = useState<Group[]>([]);

    useEffect(() => {
        getGroups().then(setGroups);
    }, []);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Tanımlı Gruplar</h2>
                <Link to="/definitions/groups/add" style={btnStyle}>+ Yeni Grup</Link>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                <thead>
                    <tr style={{ backgroundColor: '#ecf0f1', textAlign: 'left' }}>
                        <th style={{ padding: '10px' }}>Grup Adı</th>
                    </tr>
                </thead>
                <tbody>
                    {groups.map(g => (
                        <tr key={g.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '10px' }}>{g.groupName}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const btnStyle = { padding: '10px 15px', backgroundColor: '#8e44ad', color: 'white', textDecoration: 'none', borderRadius: '5px' };

export default GroupList;