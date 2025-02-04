import { useState, useEffect } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useParams } from "react-router-dom";
import toast from 'react-hot-toast';
import { io } from "socket.io-client";
import UserContext from "./Context/UserContext";
import { useContext } from "react";

const SOCKET_SERVER_URL = `http://localhost:8080`;
const socket = io(SOCKET_SERVER_URL, {
    autoConnect: false
});

function OnlineGame() {
    const { user, setUser } = useContext(UserContext);
    const [game, setGame] = useState(new Chess());
    const [color, setColor] = useState('');
    const [RoomName, setRoomName] = useState('');
    // const [turn, setTurn] = useState(0);

    useEffect(() => {
        if (!user || socket.connected) return;

        socket.io.opts.query = { username: user };
        socket.connect();

        return () => {
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        socket.on('room-name', ({ roomName, white, black }) => {
            console.log('Room name received:', roomName);
            console.log('white', white, 'black', black);
            setRoomName(roomName);
            if (white === user) {
                setColor('white');
            } else setColor('black');
        });

        socket.on('move-update', ({ fen }) => {
            setGame(new Chess(fen));
        });
    }, [])


    const onDrop = async (sourceSquare, targetSquare) => {
        if ((color === 'white' && game.turn() === 'w') || (color === 'black' && game.turn() === 'b')) {
            const move = game.move({ from: sourceSquare, to: targetSquare });

            if (move) {
                socket.emit('move-played', {
                    fen: game.fen(),
                    roomName: RoomName,
                    playedBy: user,
                    color: color,
                    move: game.history()
                });

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
        }
    };

    return (
        <div>
            <div className='w-[50%]'>
                <Chessboard id="defaultBoard"
                    position={game.fen()}
                    onPieceDrop={onDrop}
                    boardOrientation={color === "white" ? "white" : "black"}
                />
            </div>
        </div>
    )
}

export default OnlineGame;
