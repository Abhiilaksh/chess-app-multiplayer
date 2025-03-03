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
    black: {
        type: String
    },
    whiteName: {
        type: String
    },
    blackName: {
        type: String
    },
    fen: [String],
    result: {
        type: String
    },
    moves: [Object],
    roomName: {
        type: String
    }
})

const Game = mongoose.model('Game', GameSchema);
module.exports = Game;