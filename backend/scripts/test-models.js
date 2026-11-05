import User from "../src/models/User.js";
import Internship from "../src/models/Internship.js";
import Department from "../src/models/Department.js";
import CertificateTemplate from "../src/models/CertificateTemplate.js";
import CertificateRequest from "../src/models/CertificateRequest.js";
import Certificate from "../src/models/Certificate.js";
import Notification from "../src/models/Notification.js";
import Session from "../src/models/Session.js";
import AuditLog from "../src/models/AuditLog.js";

const models = {
    User,
    Internship,
    Department,
    CertificateTemplate,
    CertificateRequest,
    Certificate,
    Notification,
    Session,
    AuditLog
};

console.log("\n=== MODEL VERIFICATION ===\n");

for (const [name, model] of Object.entries(models)) {
    console.log(`G�� ${name} G�� ${model.modelName}`);
}

console.log("\nG�� All models loaded successfully.\n");
