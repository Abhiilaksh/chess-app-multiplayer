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
    fen: {
        type: String
    },
    result: {
        type: String
    }
})

const Game = mongoose.model('Game', GameSchema);
module.exports = Game;