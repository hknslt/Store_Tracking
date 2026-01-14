import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Props {
    allowedRoles: string[]; // Bu sayfaya kimler girebilir?
}

const ProtectedRoute = ({ allowedRoles }: Props) => {
    const { currentUser, userRole, loading } = useAuth();

    if (loading) return <div>Yükleniyor...</div>;

    // 1. Giriş yapmamışsa Login'e at
    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    // 2. Giriş yapmış ama Rolü henüz yüklenmemişse veya yetkisi yoksa
    // (Opsiyonel: Yetkisiz sayfasına yönlendirilebilir)
    if (userRole && !allowedRoles.includes(userRole)) {
        return <Navigate to="/unauthorized" replace />; 
    }

    // 3. Her şey yolundaysa sayfayı göster
    return <Outlet />;
};

export default ProtectedRoute;