import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

dotenv.config();

// Ensure public DNS resolvers are used to prevent querySrv ECONNREFUSED with MongoDB Atlas
try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
    // Ignore in environments where setServers is restricted
}

const connectToDB = async () => {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
        throw new Error("Mongo URI is not defined in env");
    }

    try {
        await mongoose.connect(mongoUri);
        console.log("MongoDB connected successfully");
    } catch (err) {
        console.error("MongoDB connection failed", err);
        throw err;
    }
};

export default connectToDB;
