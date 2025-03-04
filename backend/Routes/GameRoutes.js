const User = require('../database/Models/User');
const Game = require('../database/Models/Game');
const express = require("express");
const router = express.Router();

router.get("/game/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const game = await Game.findById(id);
        if (!game) return res.status(400).send({ message: "Invalid game Id" });
        res.status(200).send(game);
    } catch (err) {
        res.status(400).send(err);
    }
})


router.get("/topPlayers", async (req, res) => {
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

router.get("/currentfensAndpng/:roomId", async (req, res) => {
    try {
        const { roomId } = req.params;
        const game = await Game.findOne({ roomName: roomId });
        if (!game) res.status(400).send({ message: "Invalid room Id" });
        res.status(200).send({
            fen: game.fen,
            pgn: game.pgn,
        });
    } catch (err) {
        res.status(400).send(err);
    }
})


module.exports = router;
