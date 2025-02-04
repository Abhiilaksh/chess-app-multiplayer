import { createContext, useState, useEffect } from "react";
import axios from "axios";

const UserContext = createContext();

function Provider({ children }) {
    const [user, setUser] = useState(() => {
        return sessionStorage.getItem('user') || null;
    });

    const [loading, setloading] = useState(true);

    async function decodeToken() {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`http://localhost:8080/verifytokenAndGetUsername`, {
                token: token
            });
            if (response.status === 200) setUser(response.data.user);
        } catch (e) {
            console.log(e)
        }
        setloading(false);
    }

    useEffect(() => {
        decodeToken();
    }, [])

    useEffect(() => {
        if (user) {
            sessionStorage.setItem('user', user);
        } else {
            sessionStorage.removeItem('user');
        }
    }, [user]);

    return (
        <UserContext.Provider value={{ user, setUser, loading }}>
            {children}
        </UserContext.Provider>
    );
}

export { Provider };
export default UserContext;