const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Auth = require("../middleware/Auth");
const nodemailer = require("nodemailer");
const User = require('../database/Models/User');
const Game = require('../database/Models/Game');
const express = require("express");
const router = express.Router();

router.post('/login', async (req, res) => {
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

router.post('/signup', async (req, res) => {
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

router.post('/resetPasswordToken', async (req, res) => {
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

router.patch("/resetPassword/:token", async (req, res) => {
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

router.post('/verifytokenAndGetUsername', async (req, res) => {
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

router.get('/userGames/:id', async (req, res) => {
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

router.get('/userStats/:id', async (req, res) => {
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

router.get("/user/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) return res.status(400).send({ message: "Invalid user ID" });
        res.status(200).send(user);
    } catch (err) {
        res.status(500).send(err);
    }
})

router.delete("/user/:id", Auth, async (req, res) => {
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

router.put("/updateUser/:id", Auth, async (req, res) => {
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

module.exports = router;
