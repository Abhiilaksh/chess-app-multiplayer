import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

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
        const gameId = uuidv4();
        navigate(`/localgame/${gameId}`, { state: { player1, player2 } });
    }


    return (
        <div className="h-screen flex items-center justify-center bg-[#121212]">
            <div className="flex flex-col gap-4 p-6 bg-[#F3F4F6] rounded-sm shadow-lg">
                <h2 className="text-lg font-semibold text-gray-800 text-center">Enter Player Names</h2>

                <div className="flex flex-col gap-3">
                    <input
                        placeholder="Enter White Player name"
                        onChange={(e) => setPlayer1(e.target.value)}
                        className="p-3 w-64 bg-[#F6F6F6] border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <input
                        placeholder="Enter Black Player name"
                        onChange={(e) => setPlayer2(e.target.value)}
                        className="p-3 w-64 bg-[#F6F6F6] border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                </div>

                <div className="flex justify-center">
                    <button
                        onClick={startLocalGame}
                        className="w-32 bg-[#3982F6] text-white rounded-sm p-3 font-medium"
                    >
                        Start
                    </button>
                </div>
            </div>
        </div>
    )
}
export default LocalGamePage;