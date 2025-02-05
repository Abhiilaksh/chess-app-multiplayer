import { useState, useEffect } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useParams } from "react-router-dom";
import toast from 'react-hot-toast';
import { useLocation } from "react-router-dom";


function LocalGame() {
    const [game, setGame] = useState(() => {
        if (sessionStorage.getItem("localgame")) return new Chess(sessionStorage.getItem("localgame"));
        return new Chess();
    });
    // const [turn, setTurn] = useState(0);
    const [player, setPlayer] = useState("white");
    const params = useParams();
    const [fen, setFen] = useState(game.fen());

    const location = useLocation();
    const { player1, player2 } = location.state;

    const [movesHistory, setMovesHistory] = useState([]);

    const [player1time, setPlayer1time] = useState(() => {
        if (sessionStorage.getItem("player1time")) return sessionStorage.getItem("player1time");
        return 10;
    });
    const [player2time, setPlayer2time] = useState(() => {
        if (sessionStorage.getItem("player2time")) return sessionStorage.getItem("player2time");
        return 10;
    });


    const onDrop = async (sourceSquare, targetSquare) => {
        const move = game.move({
            from: sourceSquare, to: targetSquare,
            promotion: game.get(sourceSquare)?.type === 'p' && (targetSquare[1] === '8' || targetSquare[1] === '1') ? 'q' : undefined
        });

        if (move) {
            setGame(new Chess(game.fen()));
            if (game.isCheckmate()) {
                const winner = move.color === "w" ? "White" : "Black";
                toast.success(`${winner} wins by checkmate!`);
            } else if (game.isStalemate()) {
                toast.error("It's a stalemate! Game Over.");
            } else if (game.isDraw()) {
                toast.error("It's a draw! Game Over.");
            }


            if (player == "white") {
                setMovesHistory([...movesHistory, [game.history()]]);
                setPlayer("black");
            }
            else {
                const arr = [...movesHistory];
                arr[arr.length - 1].push(game.history());
                setMovesHistory(arr);
                setPlayer("white");
            }


            console.log(movesHistory);

            sessionStorage.setItem("localgame", game.fen());
            setFen(game.fen());
        }
    }

    function resetBoard() {
        sessionStorage.removeItem("localgame");
        setMovesHistory([]);
        setGame(new Chess());
        setPlayer("white");
    }

    const renderMovesHistory = movesHistory.map((arr, index) => {
        return (
            <div key={index} className="flex gap-1 flex-row">
                <div className="text-green-600">{index + 1}.</div>
                <div className="flex gap-2 flex-row">
                    <div>{arr[0]}</div>
                    <div>{arr[1]}</div>
                </div>
            </div>
        )
    })

    return (
        <div>
            <div className="flex justify-center mt-10 mb-10">
                <button className="bg-black p-2 text-white font-bold rounded-sm" onClick={resetBoard}>Reset Board</button>
            </div>
            <div className="flex justify-center items-center">
                <div className="flex w-full justify-center gap-4 flex-row">
                    <div className="w-60 bg-[#E4E3E3] rounded-md max-h-40 p-4 gap-2 flex-col overflow-y-auto">
                        {renderMovesHistory}
                    </div>
                    <div className="w-[40%]">
                        <Chessboard id="defaultBoard"
                            position={game.fen()}
                            onPieceDrop={onDrop}
                            boardOrientation={player}
                        />
                    </div>

                    <div className="flex justify-between flex-col">
                        <div>
                            <p>White : {player1}</p>
                        </div>

                        <div>
                            <p>Black : {player2}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    )
}

export default LocalGame;
