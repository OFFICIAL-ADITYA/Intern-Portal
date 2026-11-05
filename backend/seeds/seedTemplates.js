import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { fileURLToPath } from "url";

import connectToDB from "../src/config/database.js";
import CertificateTemplate from "../src/models/CertificateTemplate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templatesDir = path.join(__dirname, "templates");

const templates = [
  {
    templateCode: "OFFER_LETTER",
    templateName: "Offer Letter",
    certificateType: "offer_letter",
    title: "OFFER LETTER",
    file: "offer_letter.html",
  },
  {
    templateCode: "BONAFIDE",
    templateName: "Bonafide Certificate",
    certificateType: "bonafide_certificate",
    title: "BONAFIDE CERTIFICATE",
    file: "bonafide.html",
  },
  {
    templateCode: "OJT_CERTIFICATE",
    templateName: "OJT Certificate",
    certificateType: "ojt_certificate",
    title: "OJT CERTIFICATE",
    file: "ojt_certificate.html",
  },
  {
    templateCode: "EXPERIENCE_LETTER",
    templateName: "Experience Letter",
    certificateType: "experience_letter",
    title: "EXPERIENCE LETTER",
    file: "experience_letter.html",
  },
  {
    templateCode: "COMPLETION_CERTIFICATE",
    templateName: "Completion Certificate",
    certificateType: "completion_certificate",
    title: "INTERNSHIP COMPLETION CERTIFICATE",
    file: "completion_certificate.html",
  },
  {
    templateCode: "INTERN_OF_MONTH",
    templateName: "Intern of the Month",
    certificateType: "intern_of_month",
    title: "INTERN OF THE MONTH",
    file: "intern_of_month.html",
  },
  {
    templateCode: "LEAGUE_WINNER",
    templateName: "League Winner",
    certificateType: "league_winner",
    title: "LEAGUE WINNER",
    file: "league_winner.html",
  },
  {
    templateCode: "CUSTOM",
    templateName: "Custom Certificate",
    certificateType: "custom",
    title: "CUSTOM CERTIFICATE",
    file: "custom.html",
  },
];

const requiredPlaceholders = [
  "{{fullName}}",
  "{{internCode}}",
  "{{domain}}",
  "{{startDate}}",
  "{{endDate}}",
  "{{issueDate}}",
  "{{requestNumber}}",
  "{{certificateTitle}}",
  "{{qrCodeUrl}}",
];
function extractPlaceholders(html) {
  const matches = html.match(/\{\{[^{}]+\}\}/g) || [];
  return [...new Set(matches)];
}

async function seedTemplates() {
  await connectToDB();

  for (const template of templates) {
    const filePath = path.join(templatesDir, template.file);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Template file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, "utf8");

    if (!content.includes("{{fullName}}")) {
      throw new Error(
        `${template.file}: missing required {{fullName}} placeholder`
      );
    }

    // Validate Handlebars syntax.
    try {
      const Handlebars = (await import("handlebars")).default;
      Handlebars.precompile(content);
    } catch (error) {
      throw new Error(
        `${template.file}: invalid Handlebars syntax - ${error.message}`
      );
    }

    const placeholders = extractPlaceholders(content);

    const missingRequired = requiredPlaceholders.filter(
      (placeholder) => !placeholders.includes(placeholder)
    );

    if (missingRequired.length > 0) {
      throw new Error(
        `${template.file}: missing placeholders: ${missingRequired.join(", ")}`
      );
    }

    await CertificateTemplate.findOneAndUpdate(
      { certificateType: template.certificateType },
      {
        templateCode: template.templateCode,
        templateName: template.templateName,
        certificateType: template.certificateType,
        title: template.title,
        description: `${template.templateName} template`,
        content,
        htmlContent: content,
        placeholders,
        status: "active",
        version: 1,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    console.log(
      `Seeded: ${template.templateName} (${template.certificateType})`
    );
  }

  console.log(`\nSuccessfully seeded ${templates.length} templates.`);
}

seedTemplates()
  .catch((error) => {
    console.error("Template seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
