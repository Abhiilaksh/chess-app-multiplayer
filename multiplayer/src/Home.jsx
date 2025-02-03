import { useNavigate } from "react-router-dom";

function Home() {
    const navigate = useNavigate();
    return (
        <div className="flex flex-row justify-center mt-10 gap-4">
            <button onClick={() => navigate("/localgamePage")} className="p-2 bg-black text-white rounded-md">Play Local</button>
            <button onClick={() => navigate("/room")} className="p-2 bg-[#e4e3e3] text-black rounded-md">Play Online</button>
        </div>
    )
}
export default Home;