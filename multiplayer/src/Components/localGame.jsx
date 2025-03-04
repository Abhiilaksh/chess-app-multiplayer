import { useState, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useParams } from "react-router-dom";
import toast from 'react-hot-toast';
import { useLocation } from "react-router-dom";
import ScrollToBottom from 'react-scroll-to-bottom';

function LocalGame() {
    const { gameId } = useParams();
    const [game, setGame] = useState(() => {
        if (sessionStorage.getItem("localgame")) return new Chess(sessionStorage.getItem("localgame"));
        return new Chess();
    });

    const [player, setPlayer] = useState("white");
    const params = useParams();
    const [fen, setFen] = useState(game.fen());
    const location = useLocation();
    const { player1, player2 } = location.state;

    const [fens, setFens] = useState([]);
    const [pgns, setpgns] = useState([]);
    const [showfens, setShowfens] = useState(true);
    const [showPng, setShowPng] = useState(false);

    // Modified timer states to check sessionStorage first
    const [whiteTime, setWhiteTime] = useState(() => {
        const savedTime = sessionStorage.getItem("whiteTime");
        if (savedTime) return parseInt(savedTime);
        const timeControl = sessionStorage.getItem("timeControl");
        return timeControl === "infinity" ? Infinity : parseInt(timeControl) * 60;
    });

    const [blackTime, setBlackTime] = useState(() => {
        const savedTime = sessionStorage.getItem("blackTime");
        if (savedTime) return parseInt(savedTime);
        const timeControl = sessionStorage.getItem("timeControl");
        return timeControl === "infinity" ? Infinity : parseInt(timeControl) * 60;
    });
    
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const timerRef = useRef(null);

    // Modified timer effect to store times
    useEffect(() => {
        if (isTimerRunning && whiteTime !== Infinity && blackTime !== Infinity) {
            timerRef.current = setInterval(() => {
                if (player === "white") {
                    setWhiteTime(prev => {
                        const newTime = prev <= 0 ? 0 : prev - 1;
                        sessionStorage.setItem("whiteTime", newTime);
                        if (newTime <= 0) {
                            clearInterval(timerRef.current);
                            toast.success("Black wins on time!");
                            resetBoard();
                        }
                        return newTime;
                    });
                } else {
                    setBlackTime(prev => {
                        const newTime = prev <= 0 ? 0 : prev - 1;
                        sessionStorage.setItem("blackTime", newTime);
                        if (newTime <= 0) {
                            clearInterval(timerRef.current);
                            toast.success("White wins on time!");
                            resetBoard();
                        }
                        return newTime;
                    });
                }
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [player, isTimerRunning]);

    useEffect(() => {
        const storedGameId = sessionStorage.getItem("local-gameId");
        if (storedGameId != gameId) {
            resetSessionalStorage();
        }
        sessionStorage.setItem("local-gameId", gameId);
        const Fens = sessionStorage.getItem("local-fens");
        const Pgns = sessionStorage.getItem("local-pgns");

        if (Fens) setFens(JSON.parse(Fens));
        if (Pgns) setpgns(JSON.parse(Pgns));
        if (sessionStorage.getItem("localplayer")) setPlayer(sessionStorage.getItem("localplayer"));
    }, []);

    const formatTime = (seconds) => {
        if (seconds === Infinity) return "∞";
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Modified onDrop function to store initial times
    const onDrop = async (sourceSquare, targetSquare) => {
        const move = game.move({
            from: sourceSquare,
            to: targetSquare,
            promotion: game.get(sourceSquare)?.type === 'p' && 
                      (targetSquare[1] === '8' || targetSquare[1] === '1') ? 'q' : undefined
        });

        if (move) {
            setIsTimerRunning(true);
            // Store current times
            if (whiteTime !== Infinity) {
                sessionStorage.setItem("whiteTime", whiteTime);
                sessionStorage.setItem("blackTime", blackTime);
            }
            
            setGame(new Chess(game.fen()));
            if (game.isCheckmate()) {
                const winner = move.color === "w" ? "White" : "Black";
                toast.success(`${winner} wins by checkmate!`);
                resetBoard();
            } else if (game.isStalemate()) {
                toast.error("It's a stalemate! Game Over.");
                resetBoard();
            } else if (game.isDraw()) {
                toast.error("It's a draw! Game Over.");
                resetBoard();
            }

            if (player == "white") {
                setPlayer("black");
                sessionStorage.setItem("localplayer", "black");
            } else {
                setPlayer("white");
                sessionStorage.setItem("localplayer", "white");
            }
            setFen(game.fen());
            setFens(prevFens => {
                const updatedFens = [...prevFens, game.fen()];
                sessionStorage.setItem("local-fens", JSON.stringify(updatedFens));
                return updatedFens;
            });

            setpgns(prevPgns => {
                const updatedPgns = [...prevPgns, game.pgn()];
                sessionStorage.setItem("local-pgns", JSON.stringify(updatedPgns));
                return updatedPgns;
            });

            sessionStorage.setItem("localgame", game.fen());
        }
    };

    // Modified resetSessionalStorage to include time removal
    function resetSessionalStorage() {
        sessionStorage.removeItem("localgame");
        sessionStorage.removeItem("local-fens");
        sessionStorage.removeItem("local-pgns");
        sessionStorage.removeItem("localplayer");
        sessionStorage.removeItem("whiteTime");
        sessionStorage.removeItem("blackTime");
    }

    // Modified resetBoard function to handle time reset
    function resetBoard() {
        setGame(new Chess());
        setPlayer("white");
        resetSessionalStorage();
        setFens([]);
        setpgns([]);
        setIsTimerRunning(false);
        clearInterval(timerRef.current);
        const timeControl = sessionStorage.getItem("timeControl");
        const initialTime = timeControl === "infinity" ? Infinity : parseInt(timeControl) * 60;
        setWhiteTime(initialTime);
        setBlackTime(initialTime);
        // Store initial times
        if (initialTime !== Infinity) {
            sessionStorage.setItem("whiteTime", initialTime);
            sessionStorage.setItem("blackTime", initialTime);
        }
    }

    const renderFens = fens.map((fen, index) => {
        return <p className="text-gray-600" key={index}>{fen}</p>
    });

    const renderPngs = pgns.map((pgn, index) => {
        return <p className="text-gray-600" key={index}>{pgn}</p>
    });

    function toggleToFen() {
        setShowPng(false);
        setShowfens(true);
    }

    function toggleToPgn() {
        setShowfens(false);
        setShowPng(true);
    }

    return (
        <div className="bg-[#121212] h-[100vh]">
            <div className="flex justify-center items-center pt-20">
                <div className="flex w-full justify-center gap-4 flex-row">
                    <div>
                        <div className="flex justify-between flex-row w-[500px] mb-2">
                            <div className="text-white">
                                <p>White: {player1} ({formatTime(whiteTime)})</p>
                            </div>
                            <div className="text-white">
                                <p>Black: {player2} ({formatTime(blackTime)})</p>
                            </div>
                        </div>
                        <Chessboard
                            id="defaultBoard"
                            position={game.fen()}
                            onPieceDrop={onDrop}
                            
                            autoPromoteToQueen={true}
                            boardWidth={500}
                            customDarkSquareStyle={{
                                backgroundColor: "#888c94",
                            }}
                            customLightSquareStyle={{
                                backgroundColor: "#f0ecec",
                            }}
                        />
                        <div className="flex justify-center mt-10 mb-10">
                            <button className="bg-[#EF4444] p-2 text-white font-bold rounded-sm" onClick={resetBoard}>
                                Reset Board
                            </button>
                        </div>
                    </div>
                    <div className="bg-[#F3F4F6] w-[25%] h-[400px] p-4 text-white relative break-words mt-5">
                        <div className="flex flex-row justify-center gap-2">
                            <div className={`${showfens ? `bg-blue-600` : `bg-blue-500`} pl-2 pr-2 pt-1 pb-1 rounded-sm cursor-pointer`} onClick={toggleToFen}>
                                fen
                            </div>
                            <div className={`${showPng ? `bg-blue-600` : `bg-blue-500`} pl-2 pr-2 pt-1 pb-1 rounded-sm cursor-pointer`} onClick={toggleToPgn}>
                                pgn
                            </div>
                        </div>
                        <ScrollToBottom className="h-[350px] whitespace-normal p-2">
                            {showfens && <div className="flex gap-4 flex-col">{renderFens}</div>}
                            {showPng && <div className="flex gap-4 flex-col">{renderPngs}</div>}
                        </ScrollToBottom>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LocalGame;