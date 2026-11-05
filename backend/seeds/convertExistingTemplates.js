import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const certificatesDir = path.resolve(__dirname, "../../Certificates");
const outputDir = path.resolve(__dirname, "templates");

const mappings = {
  bonafide_certificate: "bonafide.html",
  experience_letter1: "experience_letter.html",
  experience_letter2: "custom.html",
  internship_completion: "completion_certificate.html",
  intern_of_month: "intern_of_month.html",
  league_winner: "league_winner.html",
  offer_letter: "offer_letter.html",
  ojt_certificate: "ojt_certificate.html",
};

const placeholderMap = {
  "{{InternName}}": "{{fullName}}",
  "{{CertificateNumber}}": "{{requestNumber}}",
  "{{ReferenceID}}": "{{requestNumber}}",

  "{{StartDate}}": "{{startDate}}",
  "{{EndDate}}": "{{endDate}}",
  "{{IssueDate}}": "{{issueDate}}",

  "{{Domain}}": "{{domain}}",
  "{{Department}}": "{{domain}}",

  "{{OrganizationName}}": "UptoSkills",

  "{{InternPosition}}": "{{certificateTitle}}",
  "{{Position}}": "{{certificateTitle}}",
};

function convertTemplate(folderName, outputFile) {
  const sourceDir = path.join(certificatesDir, folderName);

  const htmlPath = path.join(sourceDir, "index.html");
  const cssPath = path.join(sourceDir, "style.css");

  if (!fs.existsSync(htmlPath)) {
    throw new Error(`Missing HTML file: ${htmlPath}`);
  }

  if (!fs.existsSync(cssPath)) {
    throw new Error(`Missing CSS file: ${cssPath}`);
  }

  let html = fs.readFileSync(htmlPath, "utf8");
  const css = fs.readFileSync(cssPath, "utf8");

  // Remove external stylesheet links.
  html = html.replace(
    /<link[^>]*stylesheet[^>]*>/gi,
    ""
  );

  // Remove JavaScript blocks.
  html = html.replace(
    /<script[\s\S]*?<\/script>/gi,
    ""
  );

  // Replace known placeholders.
  for (const [oldValue, newValue] of Object.entries(placeholderMap)) {
    html = html.split(oldValue).join(newValue);
  }

  // Replace common QR containers with the backend-generated QR image.
  html = html.replace(
    /<div[^>]*(id|class)=["'][^"']*(qrcode|qr-code|qrCode)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
    '<img src="{{qrCodeUrl}}" alt="QR Code" class="certificate-qr-code">'
  );

  // Add the CSS directly into the HTML.
  const styleBlock = `
<style>
${css}

.certificate-qr-code {
  width: 90px;
  height: 90px;
  object-fit: contain;
}

@media print {
  @page {
    size: A4 landscape;
    margin: 0;
  }
}
</style>
`;

  if (/<\/head>/i.test(html)) {
    html = html.replace(/<\/head>/i, `${styleBlock}\n</head>`);
  } else {
    html = `${styleBlock}\n${html}`;
  }

  // Ensure the required QR placeholder exists.
  if (!html.includes("{{qrCodeUrl}}")) {
    console.warn(
      `WARNING: ${folderName} did not contain a recognizable QR container.`
    );
  }

  // Ensure certificate title placeholder exists where possible.
  if (!html.includes("{{certificateTitle}}")) {
    console.warn(
      `WARNING: ${folderName} does not currently contain {{certificateTitle}}.`
    );
  }

  const outputPath = path.join(outputDir, outputFile);

  fs.writeFileSync(outputPath, html, "utf8");

  console.log(`Created: ${outputFile}`);
}

fs.mkdirSync(outputDir, { recursive: true });

for (const [folderName, outputFile] of Object.entries(mappings)) {
  try {
    convertTemplate(folderName, outputFile);
  } catch (error) {
    console.error(`FAILED: ${folderName}`);
    console.error(error.message);
  }
}

console.log("\nTemplate conversion completed.");