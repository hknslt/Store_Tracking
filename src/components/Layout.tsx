import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";

interface Props {
    children: React.ReactNode;
}

const Layout = ({ children }: Props) => {
    const { userRole } = useAuth();

    // Mağaza Müdürü ise Sidebar yok, içerik tam ekran
    const isStoreAdmin = userRole === 'store_admin';

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8f9fa' }}>

            {/* Sidebar bileşeni kendi içinde null dönüyor ama burada da conditional render yapabiliriz */}
            {!isStoreAdmin && <Sidebar />}

            {/* Ana İçerik Alanı */}
            <div style={{
                flex: 1,
                // Sidebar varsa soldan boşluk bırak (Sidebar genişliği genelde 250px'dir)
                // Sidebar yoksa 0 margin
                marginLeft: isStoreAdmin ? 0 : '250px',
                transition: 'margin-left 0.3s ease'
            }}>
                <div style={{ padding: '20px' }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Layout;