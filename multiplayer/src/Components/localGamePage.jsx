import { useState } from "react";
import { useNavigate } from "react-router-dom";

function LocalGamePage() {
    const [player1, setPlayer1] = useState("");
    const [player2, setPlayer2] = useState("");
    const [timeControl, setTimeControl] = useState("10");
    const navigate = useNavigate();

    function continueLocalGame() {
        navigate("/localgame", { 
            state: { 
                player1: sessionStorage.getItem("player1"),
                player2: sessionStorage.getItem("player2"),
                player1Time: parseInt(sessionStorage.getItem("player1time")),
                player2Time: parseInt(sessionStorage.getItem("player2time")),
                timeControl: parseInt(sessionStorage.getItem("timeControl"))
            } 
        });
    }

    function startLocalGame() {
        if (player1.trim() == '' || player2.trim() == '') {
            alert("Enter Player Names");
            return;
        }
        sessionStorage.removeItem("localgame");
        sessionStorage.removeItem("player1time");
        sessionStorage.removeItem("player2time");
        sessionStorage.setItem("player1", player1);
        sessionStorage.setItem("player2", player2);
        sessionStorage.setItem("timeControl", timeControl);
        
        navigate("/localgame", { 
            state: { 
                player1, 
                player2, 
                timeControl: parseInt(timeControl),
                player1Time: parseInt(timeControl) * 60,
                player2Time: parseInt(timeControl) * 60
            } 
        });
    }

    return (
        <div>
            <div className="flex flex-col gap-2 items-center mt-20">
                {sessionStorage.getItem("localgame") && (
                    <button 
                        onClick={continueLocalGame} 
                        className="w-32 bg-green-600 text-white rounded-md p-2 mb-4"
                    >
                        Continue Game
                    </button>
                )}
                <div className="flex flex-col gap-1">
                    <input 
                        placeholder="Enter White Player name" 
                        onChange={(e) => setPlayer1(e.target.value)} 
                        className="p-2 w-52 bg-[#F6F6F6] outline-none rounded-sm"
                    />
                    <input 
                        placeholder="Enter Black Player name" 
                        onChange={(e) => setPlayer2(e.target.value)} 
                        className="p-2 w-52 bg-[#F6F6F6] outline-none rounded-sm"
                    />
                    <select 
                        value={timeControl}
                        onChange={(e) => setTimeControl(e.target.value)}
                        className="p-2 w-52 bg-[#F6F6F6] outline-none rounded-sm"
                    >   
                        <option value="1">1 minute</option>
                        <option value="5">5 minutes</option>
                        <option value="10">10 minutes</option>
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                    </select>
                </div>
                <button 
                    onClick={startLocalGame} 
                    className="w-20 bg-black text-white rounded-md p-2"
                >
                    Start
                </button>
            </div>
        </div>
    );
}

export default LocalGamePage;