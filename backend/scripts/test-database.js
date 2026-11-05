import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
    path: path.resolve(__dirname, "../.env")
});

import dns from "dns";

dns.setServers([
    "8.8.8.8",
    "1.1.1.1"
]);

async function testDatabase() {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is not defined");
        }

        console.log("=��� Connecting to MongoDB...");

        await mongoose.connect(process.env.MONGO_URI);

        console.log("G�� MongoDB connected successfully");

        const collections =
            await mongoose.connection.db.listCollections().toArray();

        console.log("\n=== EXISTING COLLECTIONS ===");

        collections.forEach((collection) => {
            console.log(`G�� ${collection.name}`);
        });

        await mongoose.disconnect();

        console.log("\nG�� Database test completed successfully");
    } catch (error) {
        console.error("\nG�� Database connection failed:");
        console.error(error.message);

        process.exit(1);
    }
}

testDatabase();
