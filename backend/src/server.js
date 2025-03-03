require("dotenv").config();
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
require('../database/mongoose');
const User = require('../database/Models/User');
const Game = require('../database/Models/Game');
const Message = require('../database/Models/Message');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require("nodemailer");
const EloRank = require('elo-rank');
const elo = new EloRank(32);
const Auth = require("../middleware/Auth");

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

app.post('/signup', async (req, res) => {
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

app.post('/resetPasswordToken', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email });
        if (!user) return res.status(400).send({ error: 'Email is not registered with us' });
        const token = jwt.sign({ user_id: user._id, email: user.email }, `tokenSecret`, { expiresIn: "5m" });
        let transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: "anmoltutejaserver@gmail.com",
                pass: process.env.NODEMAIL_APP_PASSWORD,
            },
        });

        let mailOptions = {
            from: "anmoltutejaserver@gmail.com",
            to: email,
            subject: 'Password Reset Token',
            text: `
            Token is valid for only 5 minutes ${token}
            `,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return res.status(400).send(error);
            }
            res.status(200).send("check mail box");
        });

    } catch (e) {
        res.status(400).send(e);
    }
})

app.patch("/resetPassword/:token", async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;
        const decoded = jwt.verify(token, `tokenSecret`);
        if (!decoded) res.status(400).send({ message: "Invalid Token" });
        const user = await User.findById(decoded.user_id);
        if (!user) return res.status(400).send({ message: "Invalid Token" });
        user.password = password;
        await user.save();
        res.status(200).send("success");
    } catch (err) {
        res.status(400).send(err);
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

app.post('/RoomMessages', async (req, res) => {
    try {
        const { roomName } = req.body;
        const messages = await Message.find({ roomName: roomName }).sort({ timestamp: 1 });
        res.status(200).send(messages);
    } catch (err) {
        res.status(400).send(err);
    }
})

app.get('/userGames/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) return res.status(400).send({ message: "Invalid user Id" });
        const whitegames = await Game.find({ white: user._id });
        const blackgames = await Game.find({ black: user._id });
        const merged = whitegames + blackgames;
        res.status(200).send(merged);
    } catch (err) {
        res.status(400).send(err);
    }
})

app.get('/userStats/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);
        if (!user) return res.status(400).send({ message: "User not found" });
        res.status(200).send({
            id: user._id,
            elo: user.elo,
            name: user.name,
            wins: user.wins,
            loses: user.loses,
            draws: user.draws,
            gamesPlayed: user.gamesHistory
        })
    } catch (err) {
        res.status(400).send(err);
    }

})

app.get("/user/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) return res.status(400).send({ message: "Invalid user ID" });
        res.status(200).send(user);
    } catch (err) {
        res.status(500).send(err);
    }
})

app.get("/game/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const game = await Game.findById(id);
        if (!game) return res.status(400).send({ message: "Invalid game Id" });
        res.status(200).send(game);
    } catch (err) {
        res.status(400).send(err);
    }
})

app.delete("/user/:id", Auth, async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        if (id != userId) return res.status(400).send("Access Denied");
        const user = await User.findByIdAndDelete(id);
        if (!user) return res.status(400).send("Invalid Id");
        res.status(200).send({
            message: "User has been deleted",
            user: user
        });
    } catch (err) {
        res.status(400).send(err);
    }
})

app.get("/topPlayers", async (req, res) => {
    const players = await User.find({}).sort({ elo: -1 }).limit(10);
    let rank = 0;
    const players_id = players.map((player) => ({
        rank: ++rank,
        id: player._id,
        elo: player.elo,
        name: player.name,
    }));
    res.status(200).send(players_id);
})


app.put("/updateUser/:id", Auth, async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        if (id != userId) return res.status(400).send({ message: "Access Denied" });
        const { name, email } = req.body;
        const user = await User.findById(id);
        if (name) user.name = name;
        if (email) user.email = email;
        await user.save();
        res.status(200).send(user);
    } catch (err) {
        res.status(400).send(err);
    }
})


server.listen(PORT, () => {
    console.log(`server is listening on ${PORT}`);
})