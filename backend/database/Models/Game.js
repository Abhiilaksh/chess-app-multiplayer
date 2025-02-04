const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
    startTime: {
        type: Date,
        default: Date.now,
        immutable: true,
    },
    white: {
        type: String
    },
    Black: {
        type: String
    },
    fen: [String],
    result: {
        type: String
    },
    movies: [String],
    roomName: {
        type: String
    }
})

const Game = mongoose.model('Game', GameSchema);
module.exports = Game;