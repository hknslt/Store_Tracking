import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCategories, getGroups } from "../../../services/definitionService";
import type { Category, Group } from "../../../types";

const CategoryList = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        // İkisini aynı anda çekiyoruz (Paralel)
        const [catsData, groupsData] = await Promise.all([
            getCategories(),
            getGroups()
        ]);

        setCategories(catsData);
        setGroups(groupsData);
    };

    const getGroupName = (groupId: string) => {
        const foundGroup = groups.find(g => g.id === groupId);
        return foundGroup ? foundGroup.groupName : "Silinmiş Grup";
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Tanımlı Kategoriler</h2>
                <Link to="/definitions/categories/add" style={btnStyle}>+ Yeni Kategori</Link>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                <thead>
                    <tr style={{ backgroundColor: '#ecf0f1', textAlign: 'left' }}>
                        <th style={{ padding: '10px' }}>Kategori Adı</th>
                        <th style={{ padding: '10px' }}>Bağlı Olduğu Grup</th>
                    </tr>
                </thead>
                <tbody>
                    {categories.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '10px', fontWeight: 'bold' }}>{c.categoryName}</td>
                            <td style={{ padding: '10px', color: '#555' }}>
                                {getGroupName(c.groupId)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const btnStyle = { padding: '10px 15px', backgroundColor: '#e67e22', color: 'white', textDecoration: 'none', borderRadius: '5px' };

export default CategoryList;    