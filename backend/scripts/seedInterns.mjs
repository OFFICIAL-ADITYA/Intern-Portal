/**
 * seedInterns.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * One-time bulk-import of interns from backend/data/interns.xlsx into MongoDB.
 *
 * Usage (from backend/ directory):
 *   node scripts/seedInterns.mjs
 *
 * Behaviour:
 *  - Skips any row whose email or internCode already exists in the DB.
 *  - Default password is the mobile number (as a string). If mobile is missing
 *    the password falls back to the intern code.
 *  - Dates can be Excel serial numbers (number) or DD/MM/YYYY strings.
 *  - Status is derived automatically: upcoming / ongoing / completed.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import 'dotenv/config';
import dns from 'dns';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/User.js';

// Use same DNS servers as the main backend (required for Atlas SRV lookup)
dns.setServers(['8.8.8.8', '1.1.1.1']);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Excel stores dates as days since 1900-01-00 (with a known leap-year bug).
 * This converts a serial number OR a DD/MM/YYYY string to a JS Date.
 */
function parseDate(raw) {
  if (!raw && raw !== 0) return null;

  // Numeric serial (Excel date)
  if (typeof raw === 'number') {
    // Excel epoch: day 1 = Jan 1 1900, but Excel incorrectly treats 1900 as leap year (+1 correction)
    const epoch = new Date(Date.UTC(1900, 0, 1));
    epoch.setUTCDate(epoch.getUTCDate() + raw - 2);
    return epoch;
  }

  // String: DD/MM/YYYY or similar
  if (typeof raw === 'string') {
    const parts = raw.trim().split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts.map(Number);
      return new Date(Date.UTC(y, m - 1, d));
    }
  }

  return null;
}

/**
 * Derive internship status based on today vs start/end dates.
 */
function deriveStatus(startDate, endDate) {
  const now = new Date();
  if (!startDate) return 'upcoming';
  if (startDate > now) return 'upcoming';
  if (endDate && endDate < now) return 'completed';
  return 'ongoing';
}

/**
 * Clean mobile number: strip country code prefix, keep digits only,
 * return as string (stored as String in schema).
 */
function cleanMobile(raw) {
  if (!raw && raw !== 0) return null;
  let str = String(raw).replace(/\D/g, ''); // digits only
  // If starts with 91 and is 12 digits, strip country code
  if (str.length === 12 && str.startsWith('91')) str = str.slice(2);
  return str || null;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Connect to MongoDB
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // 2. Read xlsx
  const xlsxPath = path.resolve(__dirname, '../data/interns.xlsx');
  const wb = XLSX.readFile(xlsxPath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // Row 0 is the table header row (Date, Intern Code, Full Name ...)
  // Actual data starts at row index 1
  const dataRows = rawRows.slice(1).filter(r => r[1] && r[2] && r[3]); // must have code, name, email

  console.log('Found ' + dataRows.length + ' intern rows in xlsx');

  let created = 0;
  let skipped = 0;
  let errors  = 0;

  for (const row of dataRows) {
    const [, internCode, fullName, email, mobileRaw, domain, startRaw, endRaw] = row;

    if (!internCode || !email || !fullName) { skipped++; continue; }

    const emailClean = String(email).trim().toLowerCase();
    const internCodeClean = String(internCode).trim();
    const mobile = cleanMobile(mobileRaw);
    const startDate = parseDate(startRaw);
    const endDate   = parseDate(endRaw);
    const status    = deriveStatus(startDate, endDate);

    // Skip if already in DB (by email or internCode)
    const existing = await User.findOne({
      $or: [{ email: emailClean }, { internCode: internCodeClean }]
    });

    if (existing) {
      console.log('  SKIP (already exists): ' + emailClean);
      skipped++;
      continue;
    }

    // Default password = mobile number string, fallback to internCode
    const plainPassword = mobile || internCodeClean;
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    try {
      await User.create({
        fullName:   String(fullName).trim(),
        email:      emailClean,
        mobileNo:   mobile,
        internCode: internCodeClean,
        domain:     domain ? String(domain).trim() : undefined,
        startDate,
        endDate,
        password:   hashedPassword,
        role:       'intern',
        internshipDetails: {
          status
        }
      });

      console.log('  OK: ' + String(fullName).trim() + ' <' + emailClean + '> [' + status + ']');
      created++;
    } catch (err) {
      console.error('  ERR for ' + emailClean + ': ' + err.message);
      errors++;
    }
  }

  console.log('');
  console.log('Created : ' + created);
  console.log('Skipped : ' + skipped);
  console.log('Errors  : ' + errors);

  await mongoose.disconnect();
  console.log('Disconnected. Done!');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
