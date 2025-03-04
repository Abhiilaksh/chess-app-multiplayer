import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

function LocalGamePage() {
    const [player1, setPlayer1] = useState("");
    const [player2, setPlayer2] = useState("");
    const [timeControl, setTimeControl] = useState("infinity");
    const [hasPreviousGame, setHasPreviousGame] = useState(false);
    const [previousGameId, setPreviousGameId] = useState(null);
    const navigate = useNavigate();
    const timeOptions = [
        { value: "1", label: "1 Minute" },
        { value: "5", label: "5 Minutes" },
        { value: "10", label: "10 Minutes" },
        { value: "15", label: "15 Minutes" },
        { value: "infinity", label: "∞" },
    ];

    // Add useEffect to check for previous game
    useEffect(() => {
        const storedGameId = sessionStorage.getItem("local-gameId");
        const storedGame = sessionStorage.getItem("localgame");
        if (storedGameId && storedGame) {
            setHasPreviousGame(true);
            setPreviousGameId(storedGameId);
        }
    }, []);

    // Add function to continue previous game
    function continuePreviousGame() {
        const player1 = sessionStorage.getItem("player1");
        const player2 = sessionStorage.getItem("player2");
        navigate(`/localgame/${previousGameId}`, {
            state: {
                player1,
                player2,
                timeLimit: sessionStorage.getItem("timeControl")
            }
        });
    }

    function startLocalGame() {
        if (player1.trim() == '' || player2.trim() == '') {
            toast.error("Enter Player Names");
            return;
        }
        // Clear all previous game data
        sessionStorage.removeItem("localgame");
        sessionStorage.removeItem("local-gameId");
        sessionStorage.removeItem("player1");
        sessionStorage.removeItem("player2");
        sessionStorage.removeItem("whiteTime");
        sessionStorage.removeItem("blackTime");
        
        // Set new game data
        sessionStorage.setItem("timeControl", timeControl);
        sessionStorage.setItem("player1", player1);
        sessionStorage.setItem("player2", player2);
        
        const gameId = uuidv4();
        sessionStorage.setItem("local-gameId", gameId);
        
        navigate(`/localgame/${gameId}`, { 
            state: { 
                player1, 
                player2, 
                timeLimit: timeControl 
            } 
        });
    }

    return (
        <div className="h-screen flex items-center justify-center bg-[#121212]">
            <div className="flex flex-col items-center gap-4 p-8 bg-[#F3F4F6] rounded-lg shadow-lg max-w-md w-full mx-4">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Enter Player Names</h2>

                <div className="flex flex-col gap-4 w-full max-w-sm">
                    {hasPreviousGame && (
                        <button
                            onClick={continuePreviousGame}
                            className="w-full bg-[#10B981] text-white rounded-md p-3 font-medium hover:bg-[#059669] transition-colors"
                        >
                            Continue Previous Game
                        </button>
                    )}

                    <input
                        placeholder="Enter White Player name"
                        onChange={(e) => setPlayer1(e.target.value)}
                        className="p-3 w-full bg-[#F6F6F6] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    
                    <input
                        placeholder="Enter Black Player name"
                        onChange={(e) => setPlayer2(e.target.value)}
                        className="p-3 w-full bg-[#F6F6F6] border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <select
                        value={timeControl}
                        onChange={(e) => setTimeControl(e.target.value)}
                        className="p-3 w-full bg-[#F6F6F6] border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-400 "
                    >
                        {timeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                        </select>
                    
                    <button
                        onClick={startLocalGame}
                        className="w-full bg-[#3982F6] text-white rounded-md p-3 font-medium hover:bg-[#2563EB] transition-colors"
                    >
                        Start New Game
                    </button>
                </div>
            </div>
        </div>
    );
}


export default LocalGamePage;