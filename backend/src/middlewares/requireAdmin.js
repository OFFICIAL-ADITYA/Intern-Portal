import userModel from "../models/User.js";

const requireAdmin = async (req, res, next) => {
    try {
        // Read the role from the database instead of trusting request data.
        const user = await userModel.findById(req.user.id).select("role");

        if (!user || user.role !== "admin") {
            return res.status(403).json({
                message: "Admin access required"
            });
        }

        next();
    } catch (err) {
        res.status(500).json({
            message: "Internal server error"
        });
    }
};

export default requireAdmin;