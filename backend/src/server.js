require("dotenv").config();
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
require('../database/mongoose');
const User = require('../database/Models/User');
const Game = require('../database/Models/Game');
const Message = require('../database/Models/Message');
const { v4: uuidv4 } = require('uuid');
const EloRank = require('elo-rank');
const elo = new EloRank(32);

const gameRoutes = require("../Routes/GameRoutes");
const userRoutes = require("../Routes/UserRoutes");

const app = express();

app.use(cors({
    origin: `http://localhost:5173`,
    credentials: true
}));
app.use(express.json());

app.use("/api", userRoutes);
app.use("/api", gameRoutes);


const PORT = process.env.PORT || 8080;

const server = http.createServer(app);

const io = socketio(server, {
    cors: {
        origin: `http://localhost:5173`,
        credentials: true
    }
});


let waitingPlayers = [];


io.on('connection', async (socket) => {
    console.log("User Joined");
    console.log("new connection event has fired", socket.id);

    const userName = socket.handshake.query.username;
    const connectedToRoom = socket.handshake.query.connectedToRoom;
    console.log(connectedToRoom, "connected to room");
    if (connectedToRoom) {
        socket.join(connectedToRoom);
        const game = await Game.findOne({ roomName: connectedToRoom });
        console.log(`Player as ${userName} Joined ${connectedToRoom} , white is ${game?.white} and black is ${game?.black}`);
        socket.emit('room-name', {
            roomName: connectedToRoom,
            white: game?.whiteName,
            black: game?.blackName
        })
    }

    const user = await User.findOne({ name: userName });

    if (user) {
        user.currentSocket = socket?.id;
    }
    await user?.save();

    if (!connectedToRoom && waitingPlayers.includes(user?.name)) {
        console.log(`User ${user.name} is already in queue`);
    }

    else if (!connectedToRoom && waitingPlayers.length > 0) {
        const waitingplayer = waitingPlayers.shift();
        console.log(`You (${userName}) is connected to ${waitingplayer}`);
        const Player1 = await User.findOne({ name: waitingplayer });
        const Player2 = await User.findOne({ name: userName });
        const roomName = uuidv4();
        const game = new Game({
            white: Player1?._id,
            black: Player2?._id,
            whiteName: Player1?.name,
            blackName: Player2?.name,
            roomName: roomName
        })
        await game.save();
        socket.join(roomName);
        io.sockets.sockets.get(Player1?.currentSocket)?.join(roomName);

        console.log("room created", roomName);
        io.to(roomName).emit('room-name', {
            roomName,
            white: game?.whiteName,
            black: game?.blackName,
        })


    } else {
        if (!connectedToRoom && !waitingPlayers.includes(user?.name)) {
            console.log(`you ${user?.name} is added to waiting list`);
            waitingPlayers.push(user?.name);
        }
    }


    socket.on('move-played', async ({ fen, roomName, playedBy, color, move, pgn }) => {
        console.log("New Move : to room ", roomName);
        socket.to(roomName).emit('move-update', { fen, pgn });
        const game = await Game.findOne({ roomName: roomName });
        if (game) {
            game.fen.push(fen);
            game.pgn.push(pgn);
            game.moves.push({ move, color });
            await game.save();
        }
    });

    socket.on('game-over', async ({ roomName, result }) => {
        const game = await Game.findOne({ roomName: roomName });
        game.result = result;
        console.log(result);
        await game.save();
        const whitePlayer = await User.findOne({ name: game.whiteName });
        const blackPlayer = await User.findOne({ name: game.blackName });

        const expectedScoreA = elo.getExpected(whitePlayer.elo, blackPlayer.elo);
        const expectedScoreB = elo.getExpected(blackPlayer.elo, whitePlayer.elo);

        if (result.includes("White") || result.includes("white")) {
            whitePlayer.wins += 1;
            whitePlayer.elo = elo.updateRating(expectedScoreA, 1, whitePlayer.elo);
            blackPlayer.loses += 1;
            blackPlayer.elo = elo.updateRating(expectedScoreB, 0, blackPlayer.elo);
        } else if (result.includes("Black") || result.includes("black")) {
            whitePlayer.loses += 1;
            whitePlayer.elo = elo.updateRating(expectedScoreA, 0, whitePlayer.elo);
            blackPlayer.wins += 1;
            blackPlayer.elo = elo.updateRating(expectedScoreB, 1, blackPlayer.elo);
        } else {
            whitePlayer.draws += 1;
            blackPlayer.draws += 1;
        }
        io.to(roomName).emit('game-end', {
            result: result
        })

        blackPlayer?.gamesHistory?.push(game._id);
        whitePlayer?.gamesHistory?.push(game._id);
        await blackPlayer.save();
        await whitePlayer.save();
    });

    socket.on('resign', async ({ roomName, user, color }) => {
        const game = await Game.findOne({ roomName: roomName });
        const whitePlayer = await User.findOne({ name: game.whiteName });
        const blackPlayer = await User.findOne({ name: game.blackName });

        const expectedScoreA = elo.getExpected(whitePlayer.elo, blackPlayer.elo);
        const expectedScoreB = elo.getExpected(blackPlayer.elo, whitePlayer.elo);

        game.result = `${color} resigned`;
        io.to(roomName).emit('game-end', {
            result: `${color} resigned !`
        })
        if (color == 'white' || color == 'White') {
            blackPlayer.wins += 1;
            blackPlayer.elo = elo.updateRating(expectedScoreB, 1, blackPlayer.elo);
            whitePlayer.loses += 1;
            whitePlayer.elo = elo.updateRating(expectedScoreA, 0, whitePlayer.elo);
        } else {
            blackPlayer.loses += 1;
            blackPlayer.elo = elo.updateRating(expectedScoreB, 0, blackPlayer.elo);
            whitePlayer.wins += 1;
            whitePlayer.elo = elo.updateRating(expectedScoreA, 1, whitePlayer.elo);
        }

        blackPlayer?.gamesHistory?.push(game._id);
        whitePlayer?.gamesHistory?.push(game._id);
        await blackPlayer.save();
        await whitePlayer.save();
    })

    socket.on('stop-searching', ({ userName }) => {
        const index = waitingPlayers.indexOf(userName);
        if (index !== -1) {
            waitingPlayers.splice(index, 1);
        }
    })

    socket.on('send-message', async ({ message, user, roomName }) => {
        const msg = new Message({
            text: message,
            roomName,
            user,
        })
        await msg.save();

        io.to(roomName).emit('new-message', msg);
    });


    socket.on('disconnect', () => {
        if (user) {
            user.currentSocket = socket?.id || '';
        }
        console.log('client has left');
    })
})


app.get('/checkWaitingQueue', async (req, res) => {
    res.status(200).send(waitingPlayers);
})

app.post('/RoomMessages', async (req, res) => {
    try {
        const { roomName } = req.body;
        const messages = await Message.find({ roomName: roomName }).sort({ timestamp: 1 });
        res.status(200).send(messages);
    } catch (err) {
        res.status(400).send(err);
    }
})

server.listen(PORT, () => {
    console.log(`server is listening on ${PORT}`);
})