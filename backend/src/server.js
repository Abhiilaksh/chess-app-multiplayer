const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
require('../database/mongoose');
const User = require('User');
const Game = require('Game');

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


let availablePlayer = null;


io.on('connection', (socket) => {
    if (availablePlayer) {

    }
    socket.on('disconnect', () => {
        console.log('client has left');
    })
})


server.listen(PORT, () => {
    console.log(`server is listening on ${PORT}`);
})