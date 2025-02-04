import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import UserContext from "../Context/UserContext";

function Home() {
    const navigate = useNavigate();
    const { user, setUser } = useContext(UserContext);
    console.log(user);

    function logout() {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        setUser("");
        navigate("/");
    }
    return (
        <div className="flex flex-row justify-center mt-10 gap-4">
            <button onClick={() => navigate("/localgamePage")} className="p-2 bg-black text-white rounded-md">Play Local</button>
            <button onClick={() => navigate("/room")} className="p-2 bg-[#e4e3e3] text-black rounded-md">Play Online</button>

            <div className="absolute right-3 top-3 "><button onClick={logout}>Logout</button></div>
        </div>
    )
}
export default Home;