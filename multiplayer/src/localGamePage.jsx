import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';

function LocalGamePage() {
    const [player1, setPlayer1] = useState("");
    const [player2, setPlayer2] = useState("");
    const navigate = useNavigate();

    function startLocalGame() {
        if (player1.trim() == '' || player2.trim() == '') {
            toast.error("Enter Player Names");
            return;
        }
        sessionStorage.removeItem("localgame");
        navigate("/localgame", { state: { player1, player2 } });
    }


    return (
        <div>
            <div className="flex flex-col gap-2 items-center mt-20">
                <div className="flex flex-col gap-1">
                    <input placeholder="Enter White Player name" onChange={(e) => setPlayer1(e.target.value)} className="p-2 w-52 bg-[#F6F6F6]  outline-none rounded-sm"></input>
                    <input placeholder="Enter Black Player name" onChange={(e) => setPlayer2(e.target.value)} className="p-2 w-52 bg-[#F6F6F6]  outline-none rounded-sm"></input>
                </div>
                <button onClick={startLocalGame} className="w-20 bg-black text-white rounded-md p-2">Start</button>
            </div>
        </div>
    )
}
export default LocalGamePage;