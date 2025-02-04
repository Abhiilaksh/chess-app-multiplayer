import { useState, useEffect } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import toast from 'react-hot-toast';
import { io } from "socket.io-client";
import UserContext from "../Context/UserContext";
import { useContext } from "react";
import { useNavigate } from "react-router-dom";

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
    const [whitePlayer, setWhitePlayer] = useState('');
    const [blackPlayer, setBlackPlayer] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (!user || socket.connected) return;

        socket.io.opts.query = { username: user };
        socket.connect();

        return () => {
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        window.addEventListener('unload', RefreshOrTabClosed);
    }, [])

    useEffect(() => {
        socket.on('room-name', ({ roomName, white, black }) => {
            console.log('Room name received:', roomName);
            console.log('white', white, 'black', black);
            setRoomName(roomName);
            if (white === user) {
                setColor('white');
            } else setColor('black');

            setWhitePlayer(white);
            setBlackPlayer(black);
        });

        socket.on('move-update', ({ fen }) => {
            setGame(new Chess(fen));
        });

        socket.on('game-end', ({ result }) => {
            toast.success(result);
        })
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
                    socket.emit('game-over', { roomName: RoomName, result: `${winner} wins by checkmate` });
                } else if (game.isStalemate()) {
                    socket.emit('game-over', { roomName: RoomName, result: `stalemate` });
                } else if (game.isDraw()) {
                    socket.emit('game-over', { roomName: RoomName, result: `draw` });
                }

                sessionStorage.setItem("game", game.fen());
            }
        }
    };


    function resign() {
        socket.emit('resign', { roomName: RoomName, user: user, color: color });
    }

    function stopSearchingForThisUser() {
        socket.emit('stop-searching', { userName: user });
    }

    function stopSearchingBtnClicked() {
        stopSearchingForThisUser();
        navigate("/home");
    }

    function RefreshOrTabClosed(e) {
        if (!RoomName) {
            stopSearchingForThisUser();

            // prob if tab closed fine 
            // if refresh removed from queue but shows waiting page
            // on again refresh due to useEffect it is added to queue
            // prob user was waiting but for him no progress 
        }

        if (RoomName) {
            // not in queue so no prob for server part
            // ask for resign for refresh , if tab is closed just let time run out 
            // currently useEffect is working which accepts a current match or create one 
        }
    }

    return (
        <div>
            {RoomName &&
                <>
                    <div>White : {whitePlayer} Black : {blackPlayer} </div>
                    <div className='w-[50%]'>
                        <Chessboard id="defaultBoard"
                            position={game.fen()}
                            onPieceDrop={onDrop}
                            boardOrientation={color === "white" ? "white" : "black"}
                        />
                    </div>
                </>}
            {
                !RoomName &&
                <>
                    <p> finding match please wait ...</p>
                    <button onClick={stopSearchingBtnClicked}>stop searching</button>
                </>
            }

            {RoomName && <button className="bg-black text-white p-2 mt-2 ml-2 rounded-sm" onClick={resign}>Resign</button>}
        </div>
    )
}

export default OnlineGame;
