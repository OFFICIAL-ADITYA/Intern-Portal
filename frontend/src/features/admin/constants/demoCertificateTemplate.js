/**
 * Demonstration Certificate Template for Day 2 Certificate Engine Review Shell.
 *
 * NOTE: This is static demonstration content used for UI review and preview
 * verification during Day 2 development. In Day 3, real certificate request
 * data and template persistence will be connected.
 */
export const DEMO_CERTIFICATE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Certificate of Internship - UptoSkills</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Montserrat:wght@400;500;600;700&family=Alex+Brush&display=swap');

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: #f1f3f9;
      font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 24px;
      color: #1a1c2e;
    }

    .certificate-wrapper {
      width: 100%;
      max-width: 860px;
      background: #ffffff;
      border: 12px solid #14162e;
      outline: 2px solid #bfa15f;
      outline-offset: -7px;
      padding: 42px 48px;
      position: relative;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      text-align: center;
      background-image: 
        radial-gradient(circle at 50% 50%, rgba(109, 114, 234, 0.03) 0%, transparent 70%),
        linear-gradient(to right, rgba(191, 161, 95, 0.04) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(191, 161, 95, 0.04) 1px, transparent 1px);
      background-size: 100% 100%, 32px 32px, 32px 32px;
    }

    .corner-accent {
      position: absolute;
      width: 28px;
      height: 28px;
      border: 3px solid #bfa15f;
    }
    .corner-tl { top: 6px; left: 6px; border-right: 0; border-bottom: 0; }
    .corner-tr { top: 6px; right: 6px; border-left: 0; border-bottom: 0; }
    .corner-bl { bottom: 6px; left: 6px; border-right: 0; border-top: 0; }
    .corner-br { bottom: 6px; right: 6px; border-left: 0; border-top: 0; }

    .brand-section {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .brand-logo-badge {
      width: 44px;
      height: 40px;
      background: linear-gradient(135deg, #6d72ea, #8c57e8);
      color: #ffffff;
      font-weight: 900;
      border-radius: 8px;
      display: grid;
      place-items: center;
      font-size: 14px;
      letter-spacing: 1px;
    }

    .brand-name {
      font-family: 'Cinzel', Georgia, serif;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 3px;
      color: #14162e;
      text-transform: uppercase;
    }

    .certificate-title-section {
      margin: 14px 0 10px;
    }

    .certificate-title {
      font-family: 'Cinzel', Georgia, serif;
      font-size: 32px;
      font-weight: 800;
      color: #1a1c2e;
      letter-spacing: 3.5px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .certificate-subtitle {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 3px;
      color: #8c733e;
      text-transform: uppercase;
    }

    .divider {
      width: 120px;
      height: 2px;
      background: linear-gradient(to right, transparent, #bfa15f, transparent);
      margin: 12px auto;
    }

    .recipient-section {
      margin: 18px 0;
    }

    .recipient-prefix {
      font-size: 12px;
      font-style: italic;
      color: #5a5f78;
      margin-bottom: 8px;
      letter-spacing: 1px;
    }

    .recipient-name {
      font-family: 'Cinzel', Georgia, serif;
      font-size: 30px;
      font-weight: 700;
      color: #5c61d9;
      border-bottom: 2px solid #e0e2ec;
      display: inline-block;
      padding: 0 32px 8px;
      min-width: 300px;
    }

    .demo-disclaimer-tag {
      display: inline-block;
      margin-top: 6px;
      font-size: 9px;
      letter-spacing: 1.5px;
      color: #8a8fa3;
      text-transform: uppercase;
      font-weight: 600;
    }

    .recognition-text {
      max-width: 620px;
      margin: 14px auto 28px;
      font-size: 13px;
      line-height: 1.7;
      color: #43475d;
      font-weight: 400;
    }

    .footer-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 28px;
      padding: 0 18px;
    }

    .seal-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .seal-circle {
      width: 68px;
      height: 68px;
      border: 3px dashed #bfa15f;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #bfa15f;
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 1px;
      background: rgba(191, 161, 95, 0.05);
      line-height: 1.2;
    }

    .sign-block {
      text-align: center;
      min-width: 170px;
    }

    .signature-placeholder {
      font-family: 'Alex Brush', cursive;
      font-size: 26px;
      color: #1f2340;
      height: 36px;
      line-height: 36px;
      margin-bottom: 4px;
    }

    .signature-line {
      border-top: 1px solid #9ea3b8;
      padding-top: 6px;
    }

    .sign-title {
      font-size: 11px;
      font-weight: 700;
      color: #14162e;
      letter-spacing: 0.5px;
    }

    .sign-role {
      font-size: 9px;
      color: #72768e;
      margin-top: 2px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .certificate-meta-bar {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #eef0f6;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #9296aa;
      letter-spacing: 0.5px;
    }

    @media print {
      body {
        background: none;
        padding: 0;
      }
      .certificate-wrapper {
        border-width: 8px;
        box-shadow: none;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="certificate-wrapper">
    <div class="corner-accent corner-tl"></div>
    <div class="corner-accent corner-tr"></div>
    <div class="corner-accent corner-bl"></div>
    <div class="corner-accent corner-br"></div>

    <div class="brand-section">
      <div class="brand-logo-badge">UP</div>
      <div class="brand-name">UptoSkills</div>
    </div>

    <div class="certificate-title-section">
      <div class="certificate-subtitle">Official Recognition of Accomplishment</div>
      <h1 class="certificate-title">Certificate of Internship</h1>
      <div class="divider"></div>
    </div>

    <div class="recipient-section">
      <p class="recipient-prefix">This is proudly presented to</p>
      <div class="recipient-name">Alex Johnson</div>
      <div><span class="demo-disclaimer-tag">Demonstration Sample Recipient</span></div>
    </div>

    <p class="recognition-text">
      for outstanding performance and successful completion of the intensive internship program in
      <strong>Full Stack Web Development</strong> at <strong>UptoSkills</strong>. During the tenure,
      the recipient demonstrated exemplary diligence, technical skill, and collaborative teamwork.
    </p>

    <div class="footer-section">
      <div class="sign-block">
        <div class="signature-placeholder">Authorized Sign</div>
        <div class="signature-line">
          <div class="sign-title">Program Coordinator</div>
          <div class="sign-role">UptoSkills Academy</div>
        </div>
      </div>

      <div class="seal-badge">
        <div class="seal-circle">
          <span>UPTO</span>
          <span>SKILLS</span>
          <span>VERIFIED</span>
        </div>
      </div>

      <div class="sign-block">
        <div class="signature-placeholder">Director Signature</div>
        <div class="signature-line">
          <div class="sign-title">Director of Training</div>
          <div class="sign-role">Internship Committee</div>
        </div>
      </div>
    </div>

    <div class="certificate-meta-bar">
      <span>Credential ID: DEMO-UPS-2026-SAMPLE</span>
      <span>Issue Date: September 11, 2026</span>
      <span>Verification: verify.uptoskills.com/demo</span>
    </div>
  </div>
</body>
</html>`;
