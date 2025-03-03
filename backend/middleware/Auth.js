const jwt = require("jsonwebtoken");

const Auth = (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1];

    if (!token) return res.status(400).json({ message: "No token found" });

    jwt.verify(token, `tokenSecret`, (err, decoded) => {
        if (err) return res.status(400).json({ message: "Invalid Token" });
        req.userId = decoded.user_id;
        next();
    });
};

module.exports = Auth;