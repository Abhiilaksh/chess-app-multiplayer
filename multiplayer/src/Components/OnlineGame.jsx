import { useState, useEffect } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import toast from 'react-hot-toast';
import { io } from "socket.io-client";
import UserContext from "../Context/UserContext";
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ScrollToBottom from 'react-scroll-to-bottom';
import BarLoader from "react-spinners/BarLoader";

const SOCKET_SERVER_URL = `http://localhost:8080`;
const socket = io(SOCKET_SERVER_URL, {
    autoConnect: false
});

function OnlineGame() {
    const { user, setUser, loading } = useContext(UserContext);
    const [game, setGame] = useState(() => {
        const fen = sessionStorage.getItem('online-game');
        if (fen) return new Chess(fen);
        return new Chess();
    });
    const [color, setColor] = useState('');
    const [RoomName, setRoomName] = useState(() => {
        const room = sessionStorage.getItem('roomName');
        if (room) return room;
        return '';
    });
    // const [turn, setTurn] = useState(0);
    const [whitePlayer, setWhitePlayer] = useState('');
    const [blackPlayer, setBlackPlayer] = useState('');
    const navigate = useNavigate();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [movesHistory, setMovesHistory] = useState([]);
    const [quote, setQuote] = useState("");
    const [boardWidth, setBoardWidth] = useState(window.innerWidth * 0.4);

    useEffect(() => {
        const handleResize = () => {
            setBoardWidth(window.innerWidth * 0.4);
        };

        window.addEventListener("resize", handleResize);
    }, []);

    useEffect(() => {

        console.log("Socket connected:", socket.connected);
        console.log("RoomName:", RoomName);
        console.log("User:", user);

        if (!user || socket.connected) return;

        socket.io.opts.query = { username: user, connectedToRoom: RoomName };
        socket.connect();

        return () => {
            socket.disconnect();
        };
    }, []);


    useEffect(() => {
        socket.on('room-name', ({ roomName, white, black }) => {
            console.log('Room name received:', roomName);
            sessionStorage.setItem('roomName', roomName);
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
            sessionStorage.setItem('online-game', fen);
        });

        socket.on('game-end', ({ result }) => {
            sessionStorage.removeItem('roomName');
            sessionStorage.removeItem('online-game');
            toast.success(result);
            navigate('/home');
        })
    }, [])


    const onDrop = async (sourceSquare, targetSquare) => {
        if ((color === 'white' && game.turn() === 'w') || (color === 'black' && game.turn() === 'b')) {

            const move = game.move({
                from: sourceSquare, to: targetSquare,
                promotion: game.get(sourceSquare)?.type === 'p' && (targetSquare[1] === '8' || targetSquare[1] === '1') ? 'q' : undefined
            });

            if (move) {
                socket.emit('move-played', {
                    fen: game.fen(),
                    roomName: RoomName,
                    playedBy: user,
                    color: color,
                    move: game.history()
                });

                setGame(new Chess(game.fen()));
                const fen = game.fen();
                sessionStorage.setItem('online-game', fen);
                if (game.isCheckmate()) {
                    const winner = move.color === "w" ? "White" : "Black";
                    socket.emit('game-over', { roomName: RoomName, result: `${winner} wins by checkmate` });
                    navigate('/home');
                } else if (game.isStalemate()) {
                    socket.emit('game-over', { roomName: RoomName, result: `stalemate` });
                    navigate('/home');
                } else if (game.isDraw()) {
                    socket.emit('game-over', { roomName: RoomName, result: `draw` });
                    navigate('/home');
                }

                sessionStorage.setItem("game", game.fen());
            }
        }
    };



    function resign() {
        socket.emit('resign', { roomName: RoomName, user: user, color: color });
        toast.success(`${color} resigned`);
        navigate('/home');
    }

    function stopSearchingForThisUser() {
        socket.emit('stop-searching', { userName: user });
    }

    function stopSearchingBtnClicked() {
        stopSearchingForThisUser();
        navigate("/home");
    }


    function sendMessage() {
        socket.emit('send-message', {
            roomName: RoomName, message: message, user: user
        })
        setMessage('');
    }


    useEffect(() => {
        socket.on('new-message', (msg) => {
            setMessages(prevMessages => [...prevMessages, msg]);
        });
    }, [])

    useEffect(() => {
        getRoomMessages();
    }, [])

    const fetchQuote = async () => {
        try {
            const response = await axios.get("https://raw.githubusercontent.com/datavizard/chess-quotes-api/master/quotes.json");
            const quotes = response.data;
            const random = quotes[Math.floor(Math.random() * quotes.length)];
            setQuote(`"${random.quote}" - ${random.name}`);
        } catch (e) {
            console.log(e);
        }
    };
    useEffect(() => {
        fetchQuote();
    }, []);

    async function getRoomMessages() {
        if (RoomName && user) {
            try {
                const response = await axios.post(`http://localhost:8080/RoomMessages`, {
                    roomName: RoomName,
                })
                console.log(response.data);
                setMessages(response.data);
            } catch (e) {
                console.log(e)
            }
        }
    }

    const renderMessages = messages.map((msg, index) => {
        return (<div key={index}>
            <p className={`font-bold ${msg.user === user ? 'text-green-600' : 'text-orange-500'}`} >{msg.user}</p>
            <div className="flex flex-col">
                <div className="text-sm text-gray-200">{msg.timestamp}</div>
                <div>{msg.text}</div>
            </div>
        </div>)
    })

    return (
        <div>
            {RoomName &&
                <div className="flex items-center justify-around">
                    <div className="bg-[#262422] w-[28%] flex flex-col p-4 text-white">
                        <p className="text-xl">Chat Room</p>
                        <ScrollToBottom className="h-[400px] overflow-x-auto whitespace-normal p-2">
                            {renderMessages}
                        </ScrollToBottom>
                        <input className="outline-none bg-[#403e3b] p-1 relative bottom-0"
                            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                            onChange={(e) => setMessage(e.target.value)}
                            value={message}
                        ></input>
                    </div>
                    <div className="flex justify-center flex-col items-center mt-10">
                        <div className="flex flex-row justify-between w-full">
                            <div>{user === whitePlayer ? blackPlayer : whitePlayer}</div>
                            <div>10:00</div>
                        </div>
                        <div>
                            <Chessboard id="defaultBoard"
                                position={game.fen()}
                                onPieceDrop={onDrop}
                                boardOrientation={color === "white" ? "white" : "black"}
                                autoPromoteToQueen={true}
                                boardWidth={boardWidth}
                            />
                        </div>
                        <div className="flex flex-row justify-between w-full">
                            <div>{user} (You)</div>
                            <div>10:00</div>
                        </div>
                        <button className="bg-black text-white p-2 mt-2 rounded-sm w-20" onClick={resign}>Resign</button>
                    </div>

                    <div className="bg-[#262422] w-[25%] h-[400px] p-4 text-white relative">
                        <div></div>
                        <div className="bg-[#484746] rounded-sm w-[90%] break-words p-1 absolute bottom-2">
                            {game.fen()}
                        </div>
                    </div>

                </div>
            }
            {
                !RoomName &&
                <div className="flex justify-center mt-[20%] items-center flex-col gap-2">
                    <div>{quote}</div>
                    <BarLoader
                        size={150}
                        aria-label="Loading Spinner"
                        data-testid="loader"
                    />
                    <button onClick={stopSearchingBtnClicked} className="bg-black text-white rounded-md p-2">stop searching</button>
                </div>
            }

        </div>
    )
}

export default OnlineGame;
