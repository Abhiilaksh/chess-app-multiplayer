import { useContext, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import UserContext from "../Context/UserContext";

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useContext(UserContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && !user) {
            navigate("/");
        }
    }, [user, loading, navigate]);

    if (loading) {
        return <h1>Loading...</h1>;
    }
    return user ? children : null;
};

export default ProtectedRoute;