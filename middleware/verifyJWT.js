const jwt = require('jsonwebtoken');
require('dotenv').config()

const verifyJWT = (req, res, next) => {
    // const authHeader = req.headers['Authorization'];
    // console.log("authheader", authHeader);
    // if (!authHeader) return res.sendStatus(401);
    // const token = authHeader.split(' ')[1];
    const token = req.cookies.jwt_accessToken
    jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET,
        (err, decoded) => {
            if (err) return res.sendStatus(403);
            req.userId = decoded.userId;
            console.log(decoded.userId)
            next();
        }
    );
}

module.exports = verifyJWT