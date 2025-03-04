import { useState, useEffect } from "react";
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
    }, [])


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
            }
            else {
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
    }

    function resetSessionalStorage() {
        sessionStorage.removeItem("localgame");
        sessionStorage.removeItem("local-fens");
        sessionStorage.removeItem("local-pgns");
        sessionStorage.removeItem("localplayer");
    }

    function resetBoard() {
        setGame(new Chess());
        setPlayer("white");
        resetSessionalStorage();
        setFens([]);
        setpgns([]);
    }

    const renderFens = fens.map((fen, index) => {
        return <p className="text-gray-600" key={index}>{fen}</p>
    })

    const renderPngs = pgns.map((pgn, index) => {
        return <p className="text-gray-600" key={index}>{pgn}</p>
    })

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
                        <div className="flex justify-between flex-row">
                            <div className="text-white">
                                <p>White : {player1}</p>
                            </div>

                            <div className="text-white">
                                <p>Black : {player2}</p>
                            </div>
                        </div>
                        <Chessboard id="defaultBoard"
                            position={game.fen()}
                            onPieceDrop={onDrop}
                            boardOrientation={player}
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
                            <button className="bg-[#EF4444] p-2 text-white font-bold rounded-sm" onClick={resetBoard}>Reset Board</button>
                        </div>
                    </div>
                    <div className="bg-[#F3F4F6] w-[25%] h-[400px] p-4 text-white relative break-words mt-5">
                        <div className="flex flex-row justify-center gap-2">
                            <div className={`${showfens ? `bg-blue-600` : `bg-blue-500`}  pl-2 pr-2 pt-1 pb-1 rounded-sm cursor-pointer`} onClick={toggleToFen}>fen</div>
                            <div className={`${showPng ? `bg-blue-600` : `bg-blue-500`} pl-2 pr-2 pt-1 pb-1 rounded-sm cursor-pointer`} onClick={toggleToPgn}>pgn</div>
                        </div>
                        <ScrollToBottom className="h-[350px] whitespace-normal p-2">
                            {showfens && <div className="flex gap-4 flex-col">
                                {renderFens}
                            </div>
                            }
                            {showPng && <div className="flex gap-4 flex-col">
                                {renderPngs}
                            </div>
                            }
                        </ScrollToBottom>
                    </div>

                </div>
            </div>
        </div >
    )
}

export default LocalGame;
