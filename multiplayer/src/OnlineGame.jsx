import { useState, useEffect } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useParams } from "react-router-dom";
import toast from 'react-hot-toast';
import { io } from "socket.io-client";
import UserContext from "./Context/UserContext";
import { useContext } from "react";

function OnlineGame() {
    const { user, setUser } = useContext(UserContext);
    console.log(user);
    const [game, setGame] = useState(() => {
        if (sessionStorage.getItem("game")) return new Chess(sessionStorage.getItem("game"));
        return new Chess();
    });
    // const [turn, setTurn] = useState(0);

    const SOCKET_SERVER_URL = `http://localhost:8080`;
    const socket = io(SOCKET_SERVER_URL, {
        query: { username: user }
    });

    useEffect(() => {
        socket.on('room-name', ({ roomName }) => {
            console.log('Room name received:', roomName);
        });
    }, [])


    const onDrop = async (sourceSquare, targetSquare) => {
        const move = game.move({ from: sourceSquare, to: targetSquare });

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

            sessionStorage.setItem("game", game.fen());
        }
    };

    return (
        <div>
            <div className='w-[50%]'>
                <Chessboard id="defaultBoard"
                    position={game.fen()}
                    onPieceDrop={onDrop} />
            </div>
        </div>
    )
}

export default OnlineGame;
