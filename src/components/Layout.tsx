import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";

interface Props {
    children: React.ReactNode;
}

const Layout = ({ children }: Props) => {
    const { userRole } = useAuth();
    const isStoreAdmin = userRole === 'store_admin';

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8f9fa' }}>

            {!isStoreAdmin && <Sidebar />}

            <div style={{
                flex: 1,
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