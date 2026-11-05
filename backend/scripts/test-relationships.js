import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
import path from "path";
import { fileURLToPath } from "url";

import userModel from "../src/models/User.js";
import departmentModel from "../src/models/Department.js";
import internshipModel from "../src/models/Internship.js";
import certificateTemplateModel from "../src/models/CertificateTemplate.js";
import certificateRequestModel from "../src/models/CertificateRequest.js";
import certificateModel from "../src/models/Certificate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
    path: path.resolve(__dirname, "../.env")
});

dns.setServers([
    "8.8.8.8",
    "1.1.1.1"
]);

async function testRelationships() {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is not defined");
        }

        console.log("=ƒöä Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("G£à MongoDB connected successfully\n");

        // =========================================================
        // TEST 1 GÇö a fake reference should be rejected
        // =========================================================
        console.log("=== TEST 1: saving an Internship with a FAKE userId (should fail) ===");
        try {
            await internshipModel.create({
                userId: new mongoose.Types.ObjectId(),
                internCode: "FAKE-CODE",
                companyName: "Fake Co",
                startDate: new Date(),
                endDate: new Date()
            });
            console.log("G¥î UNEXPECTED: this save should have been rejected");
        } catch (err) {
            console.log("G£à Correctly rejected:", err.message);
        }

        // =========================================================
        // TEST 2 GÇö build a real, valid linked chain
        // =========================================================
        console.log("\n=== TEST 2: building a real linked chain ===");

        const admin = await userModel.findOne({ role: "admin" });
        const intern = await userModel.findOne({ role: "intern" });

        if (!admin || !intern) {
            console.log("GÜán+Å  Skipping GÇö need at least one 'admin' and one 'intern' user in the users collection.");
            await mongoose.disconnect();
            return;
        }

        let department = await departmentModel.findOne({ departmentCode: "REL-TEST" });
        if (!department) {
            department = await departmentModel.create({
                departmentCode: "REL-TEST",
                departmentName: "Relationship Test Department"
            });
        }
        console.log("G£à Department ready:", department._id.toString());

        let internship = await internshipModel.findOne({ internCode: "REL-TEST-001" });
        if (!internship) {
            internship = await internshipModel.create({
                userId: intern._id,
                internCode: "REL-TEST-001",
                companyName: "UpToSkills",
                domain: "Software Development",
                startDate: new Date("2026-01-01"),
                endDate: new Date("2026-06-01"),
                status: "ongoing"
            });
        }
        console.log("G£à Internship ready and linked to real user:", internship._id.toString());

        let template = await certificateTemplateModel.findOne({ templateCode: "REL-TEST-TPL" });
        if (!template) {
            template = await certificateTemplateModel.create({
                templateCode: "REL-TEST-TPL",
                templateName: "Relationship Test Template",
                certificateType: "completion",
                title: "Certificate of Completion",
                createdBy: admin._id
            });
        }
        console.log("G£à CertificateTemplate ready and linked to real admin:", template._id.toString());

        const request = await certificateRequestModel.create({
            requestNumber: `REQ-${Date.now()}`,
            userId: intern._id,
            internCode: internship.internCode,
            internshipId: internship._id,
            certificateType: "completion",
            templateId: template._id,
            status: "approved",
            reviewedBy: admin._id,
            reviewedAt: new Date()
        });
        console.log("G£à CertificateRequest created and linked to real intern + internship + template + reviewer");

        const certificate = await certificateModel.create({
            certificateNumber: `CERT-${Date.now()}`,
            userId: intern._id,
            internCode: internship.internCode,
            internshipId: internship._id,
            templateId: template._id,
            certificateType: "completion",
            verificationCode: `VER-${Date.now()}`,
            generatedBy: admin._id
        });
        console.log("G£à Certificate created and linked to real intern + internship + template + generator");

        // =========================================================
        // TEST 3 GÇö the actual join query (.populate())
        // =========================================================
        console.log("\n=== TEST 3: join query GÇö fetch the certificate WITH real linked data ===");

        const joined = await certificateModel.findById(certificate._id)
            .populate("userId", "fullName email role")
            .populate("internshipId", "internCode companyName domain")
            .populate("templateId", "templateName certificateType")
            .populate("generatedBy", "fullName email role");

        console.log(JSON.stringify(joined, null, 2));

        console.log("\nG£à All relationship tests complete.");
        await mongoose.disconnect();
    } catch (error) {
        console.error("\nG¥î Relationship test failed:");
        console.error(error.message);
        process.exit(1);
    }
}

testRelationships();
