import dns from "dns";

dns.setServers([
  "8.8.8.8",
  "1.1.1.1"
]);

import "dotenv/config";
import mongoose from "mongoose";
import Counter from "./src/models/Counter.model.js";

try {
    await mongoose.connect(process.env.MONGO_URI);

    const results = await Promise.all(
        Array.from({ length: 10 }, async () => {
            const counter = await Counter.findOneAndUpdate(
                { _id: "certRequest" },
                { $inc: { seq: 1 } },
                {
                    new: true,
                    upsert: true
                }
            );

            return counter.seq;
        })
    );

    console.log("Generated sequence numbers:");
    console.log(results);

    const uniqueNumbers = new Set(results);

    console.log("Total generated:", results.length);
    console.log("Unique generated:", uniqueNumbers.size);

    if (uniqueNumbers.size === 10) {
        console.log("SUCCESS: All 10 numbers are unique.");
    } else {
        console.log("FAILED: Duplicate numbers detected.");
    }

    await mongoose.disconnect();
} catch (error) {
    console.error("Test failed:");
    console.error(error);
    process.exit(1);
}