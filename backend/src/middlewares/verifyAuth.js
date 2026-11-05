import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config()

const verifyAuth = async (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({
                message: "Unauthorized, token not found"
            });

        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;

        next();

    }catch(err){
        res.status(401).json({
            message:"invalid or expired token"
        })
    }
}

export default verifyAuth