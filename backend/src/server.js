const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
require('../database/mongoose');
const User = require('../database/Models/User');
const Game = require('../database/Models/Game');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const app = express();

app.use(cors({
    origin: `http://localhost:5173`,
    credentials: true
}));
app.use(express.json());


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
            white: game?.white,
            black: game?.black
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
            white: Player1?.name,
            black: Player2?.name,
            roomName: roomName
        })
        await game.save();
        socket.join(roomName);
        io.sockets.sockets.get(Player1?.currentSocket)?.join(roomName);

        console.log("room created", roomName);
        io.to(roomName).emit('room-name', {
            roomName,
            white: game?.white,
            black: game?.black
        })


    } else {
        if (!connectedToRoom && !waitingPlayers.includes(user?.name)) {
            console.log(`you ${user?.name} is added to waiting list`);
            waitingPlayers.push(user?.name);
        }
    }


    socket.on('move-played', async ({ fen, roomName, playedBy, color, move }) => {
        console.log("New Move : to room ", roomName);
        socket.to(roomName).emit('move-update', { fen });
        const game = await Game.findOne({ roomName: roomName });
        if (game) {
            game.fen.push(fen);
            game.moves.push({ move, color });
            await game.save();
        }
    });

    socket.on('game-over', async ({ roomName, result }) => {
        const game = await Game.findOne({ roomName: roomName });
        game.result = result;
        await game.save();
        io.to(roomName).emit('game-end', {
            result: result
        })
    });

    socket.on('resign', async ({ roomName, user, color }) => {
        const game = await Game.findOne({ roomName: roomName });
        game.result = `${color} resigned`;
        io.to(roomName).emit('game-end', {
            result: `${color} resigned !`
        })
    })

    socket.on('stop-searching', ({ userName }) => {
        const index = waitingPlayers.indexOf(userName);
        if (index !== -1) {
            waitingPlayers.splice(index, 1);
        }
    })


    socket.on('disconnect', () => {
        if (user) {
            user.currentSocket = socket?.id || '';
        }
        console.log('client has left');
    })
})

app.post('/login', async (req, res) => {
    const { email, password, name } = req.body;
    try {
        const user = await User.findOne({ email, name });
        if (!user) {
            return res.status(400).send({ error: "Invalid Credentials" });
        }
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(400).send({ error: "Invalid Credentials" });
        }

        const token = jwt.sign({ user_id: user._id }, `tokenSecret`, { expiresIn: '30d' });
        res.status(200).send({ token });
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
});

app.post('/signups', async (req, res) => {
    const { email, password, name } = req.body;
    try {
        const user = new User({ email, password, name });
        await user.save();
        const token = jwt.sign({ user_id: user._id }, `tokenSecret`, { expiresIn: '30d' });
        res.status(200).send({ token });
    } catch (e) {
        res.status(400).send({ error: e.message });
    }
})

app.post('/resetPassword', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) return res.status(400).send({ error: 'Email is not registered with us' });
        user.password = req.body.password;
        await user.save();
        res.status(200).send('success');
    } catch (e) {
        res.status(400).send(e);
    }
})

app.post('/verifytokenAndGetUsername', async (req, res) => {
    const { token } = req.body;

    try {
        const decoded = jwt.verify(token, `tokenSecret`);
        const user = await User.findById(decoded.user_id);

        if (!user) {
            return res.status(404).send({ error: 'Invalid or expired token' });
        }

        res.status(200).send({ user: user.name });
    } catch (e) {
        res.status(400).send({ error: 'Invalid or expired token' });
    }
});

app.get('/checkWaitingQueue', async (req, res) => {
    res.status(200).send(waitingPlayers);
})



server.listen(PORT, () => {
    console.log(`server is listening on ${PORT}`);
})