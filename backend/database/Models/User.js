const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');


const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error('please provide valid email');
            }
        }
    },
    password: {
        type: String,
        required: true,
        minLength: 8,
        trim: true,
        validate(value) {
            if (!validator.isStrongPassword(value, {
                minLength: 8,
                minLowercase: 1,
                minUppercase: 1,
                minNumbers: 1,
                minSymbols: 1
            })) {
                throw new Error("Password must be at least 8 characters long, contain at least one lowercase letter, one uppercase letter, one number, and one symbol.");
            }
        }
    },
    profilePic: {
        type: String
    },
    JoinedDate: {
        type: Date,
        default: Date.now,
        immutable: true
    },
    gamesHistory: [String],
    elo: {
        type: Number,
        default: 400
    },
    currentSocket: {
        type: String
    },
    wins: {
        type: Number,
        default: 0
    },
    loses: {
        type: Number,
        default: 0
    },
    draws: {
        type: Number,
        default: 0
    }
})

UserSchema.pre('save', async function (next) {
    const user = this;
    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8);
    }
    next();
});


const User = mongoose.model('User', UserSchema);
module.exports = User;