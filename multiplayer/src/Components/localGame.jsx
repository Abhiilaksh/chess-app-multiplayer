import { useState, useEffect, useRef, useCallback } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useLocation } from "react-router-dom";
import toast from 'react-hot-toast';

function LocalGame() {
    const location = useLocation();
    const { player1, player2, timeControl } = location.state;
    
    // Initialize game state
    const [game, setGame] = useState(() => (
        new Chess(sessionStorage.getItem("localgame") || undefined)
    ));
    const [player, setPlayer] = useState("white");
    const [fen, setFen] = useState(game.fen());
    const [movesHistory, setMovesHistory] = useState([]);
    const [isTimerRunning, setIsTimerRunning] = useState(true);
    
    // Timer states
    const [player1Time, setPlayer1Time] = useState(() => (
        parseInt(sessionStorage.getItem("player1time")) || timeControl * 60
    ));
    const [player2Time, setPlayer2Time] = useState(() => (
        parseInt(sessionStorage.getItem("player2time")) || timeControl * 60
    ));
    const timerInterval = useRef(null);

    // Handle timer logic
    const handleTimer = useCallback((currentPlayer, timeLeft, setTimeLeft) => {
        const newTime = timeLeft - 1;
        sessionStorage.setItem(`${currentPlayer}time`, newTime);
        
        if (newTime <= 0) {
            clearInterval(timerInterval.current);
            toast.error(`${currentPlayer === 'player1' ? 'Black' : 'White'} wins on time!`);
            setIsTimerRunning(false);
        }
        return newTime;
    }, []);

    useEffect(() => {
        if (!isTimerRunning) return;

        timerInterval.current = setInterval(() => {
            if (player === "white") {
                setPlayer1Time(prev => handleTimer('player1', prev, setPlayer1Time));
            } else {
                setPlayer2Time(prev => handleTimer('player2', prev, setPlayer2Time));
            }
        }, 1000);

        return () => clearInterval(timerInterval.current);
    }, [player, isTimerRunning, handleTimer]);

    const formatTime = useCallback((seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }, []);

    const checkGameStatus = useCallback((move) => {
        if (game.isCheckmate()) {
            const winner = move.color === "w" ? "White" : "Black";
            toast.success(`${winner} wins by checkmate!`);
            setIsTimerRunning(false);
        } else if (game.isStalemate()) {
            toast.error("It's a stalemate! Game Over.");
            setIsTimerRunning(false);
        } else if (game.isDraw()) {
            toast.error("It's a draw! Game Over.");
            setIsTimerRunning(false);
        }
    }, [game]);

    const onDrop = useCallback((sourceSquare, targetSquare) => {
        const move = game.move({
            from: sourceSquare,
            to: targetSquare,
            promotion: game.get(sourceSquare)?.type === 'p' && 
                      (targetSquare[1] === '8' || targetSquare[1] === '1') ? 'q' : undefined
        });

        if (!move) return false;

        setGame(new Chess(game.fen()));
        checkGameStatus(move);

        // Update moves history
        if (player === "white") {
            setMovesHistory(prev => [...prev, [game.history()]]);
            setPlayer("black");
        } else {
            setMovesHistory(prev => {
                const arr = [...prev];
                arr[arr.length - 1].push(game.history());
                return arr;
            });
            setPlayer("white");
        }

        // Save game state
        sessionStorage.setItem("localgame", game.fen());
        setFen(game.fen());
        return true;
    }, [game, player, checkGameStatus]);

    const resetBoard = useCallback(() => {
        // Clear session storage
        ["localgame", "player1time", "player2time"].forEach(key => 
            sessionStorage.removeItem(key)
        );
    
        const newGame = new Chess();
        setGame(newGame);
        setFen(newGame.fen());
        setMovesHistory([]);
        setPlayer("white");
    
        setPlayer1Time(timeControl * 60);
        setPlayer2Time(timeControl * 60);
        setIsTimerRunning(true);
    }, [timeControl]);

    return (
        <div className="container mx-auto px-4">
            <div className="flex justify-center mt-10 mb-10">
                <button 
                    className="bg-black p-2 text-white font-bold rounded-sm hover:bg-gray-800" 
                    onClick={resetBoard}
                >
                    Reset Board
                </button>
            </div>
            <div className="flex justify-center items-center">
                <div className="grid grid-cols-3 gap-4">
                    <div className="w-60 bg-[#E4E3E3] rounded-md max-h-40 p-4 overflow-y-auto">
                        {movesHistory.map((arr, index) => (
                            <div key={index} className="flex gap-1 flex-row">
                                <span className="text-green-600">{index + 1}.</span>
                                <div className="flex gap-2">
                                    <span>{arr[0]}</span>
                                    <span>{arr[1]}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div>
                        <Chessboard
                            id="defaultBoard"
                            position={fen}
                            onPieceDrop={onDrop}
                            boardOrientation={player}
                            autoPromoteToQueen={true}
                            boardWidth={500}
                        />
                    </div>
                    <div className="flex justify-between flex-col">
                        <div className="p-4 bg-white rounded shadow">
                            <p className="font-bold">White: {player1}</p>
                            <p>Time: {formatTime(player1Time)}</p>
                        </div>
                        <div className="p-4 bg-white rounded shadow">
                            <p className="font-bold">Black: {player2}</p>
                            <p>Time: {formatTime(player2Time)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LocalGame;