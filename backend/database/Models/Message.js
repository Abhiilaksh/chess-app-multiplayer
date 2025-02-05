const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    roomName: {
        type: String
    },
    text: {
        type: String
    },
    user: {
        type: String
    },
    timestamp: {
        type: Date,
        default: Date.now,
        immutable: true
    }
})

const Message = mongoose.model('Message', MessageSchema);
module.exports = Message;