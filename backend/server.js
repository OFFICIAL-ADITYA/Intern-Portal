import dotenv from "dotenv";
dotenv.config();

import app from "./src/app.js";
import connectToDB from "./src/config/database.js";
import { scheduleInternshipStatusJob } from "./src/jobs/internshipStatus.job.js";
import { scheduleRetentionJob } from "./src/jobs/retention.job.js";

export const REQUIRED_ENV_VARS = [
    'MONGO_URI',
    'JWT_SECRET',
    'FRONTEND_URL',
    'BREVO_SMTP_USER',
    'BREVO_SMTP_KEY'
];

export function validateEnv() {
    const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key] || !process.env[key].trim());
    if (missing.length > 0) {
        const errorMsg = `FATAL: Server startup aborted. Missing required environment variable(s): ${missing.join(', ')}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
    }
}

const startServer = async () => {
    validateEnv();
    await connectToDB();
    scheduleInternshipStatusJob();
    scheduleRetentionJob();

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`server is listening on port ${PORT}`);
    });
};

// Log and exit on unhandled rejections and uncaught errors so the host restarts the app
process.on('unhandledRejection', (reason, promise) => {
    console.error('FATAL: Unhandled Promise Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('FATAL: Uncaught Exception thrown:', error);
    process.exit(1);
});

// Only auto-start when executed directly
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
    startServer().catch((error) => {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    });
}

export default startServer;
