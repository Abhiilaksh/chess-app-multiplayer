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
    const [fens, setFens] = useState([]);
    const [showfens, setShowfens] = useState(true);
    const [pgns, setPgns] = useState([]);
    const [showPng, setShowPng] = useState(false);

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

        socket.on('move-update', ({ fen, pgn }) => {
            setGame(new Chess(fen));
            sessionStorage.setItem('online-game', fen);
            setFens(prevFens => [...prevFens, fen]);
            setPgns(prevPgn => [...prevPgn, pgn]);
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
                    move: game.history(),
                    pgn: game.pgn()
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
                setFens(prevFens => [...prevFens, game.fen()]);
                setPgns(prevPgn => [...prevPgn, game.pgn()]);
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

    async function getRoomFensAndPng() {
        try {
            const res = await axios.get(`http://localhost:8080/api/currentfensAndpng/${RoomName}`);
            setFens(res.data.fen);
            setPgns(res.data.pgn);
        } catch (err) {
            console.log(err);
        }
    }

    useEffect(() => {
        getRoomFensAndPng();
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

    const renderFens = fens.map((fen, index) => {
        return <p className="text-gray-600" key={index}>{fen}</p>
    })

    const renderPngs = pgns.map((pgn, index) => {
        return <p className="text-gray-600" key={index}>{pgn}</p>
    })

    const renderMessages = messages.map((msg, index) => {
        return (<div key={index} className=" rounded-sm">
            <p className={` ${msg.user === user ? 'text-green-600' : 'text-orange-500'}`} >{msg.user}</p>
            <div className="flex flex-col">
                <div className="text-xs text-gray-600">{msg.timestamp}</div>
                <div className="text-black bg-[#f8f7f7] rounded-md p-1 px-2">{msg.text}</div>
            </div>
        </div>)
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
        <div>
            {RoomName &&
                <div className="flex items-center justify-around bg-[#121212] h-[100vh]">
                    <div className="bg-[#F3F4F6] w-[28%] flex flex-col p-4 text-white">
                        <p className="text-xl text-black font-semibold border-b-2 pb-2">Chat Room</p>
                        <ScrollToBottom className="h-[400px] overflow-x-auto whitespace-normal p-2">
                            <div className="flex gap-4 flex-col">
                                {renderMessages}
                            </div>
                        </ScrollToBottom>
                        <input className="outline-none bg-[#ebeaea] p-1 relative bottom-0 text-black"
                            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                            onChange={(e) => setMessage(e.target.value)}
                            value={message}
                            placeholder="Type To Chat"

                        ></input>
                    </div>
                    <div className="flex justify-center flex-col items-center mt-10">
                        <div className="flex flex-row justify-between w-full text-white">
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
                                customDarkSquareStyle={{
                                    backgroundColor: "#888c94",
                                }}
                                customLightSquareStyle={{
                                    backgroundColor: "#f0ecec",
                                }}
                            />
                        </div>
                        <div className="flex flex-row justify-between w-full text-white">
                            <div>{user} (You)</div>
                            <div>10:00</div>
                        </div>
                        <button className="bg-red-500 text-white p-2 mt-2 rounded-sm w-20" onClick={resign}>Resign</button>
                    </div>

                    <div className="bg-[#F3F4F6] w-[25%] h-[400px] p-4 text-white relative break-words">
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
            }
            {
                !RoomName &&
                <div className="flex justify-center items-center flex-col gap-2 bg-[#121212] h-[100vh]">
                    <div className="text-white">{quote}</div>
                    <BarLoader
                        size={150}
                        aria-label="Loading Spinner"
                        data-testid="loader"
                    />
                    <button onClick={stopSearchingBtnClicked} className="bg-white text-black rounded-sm p-2">stop searching</button>
                </div>
            }

        </div>
    )
}

export default OnlineGame;
