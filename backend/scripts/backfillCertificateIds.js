import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dns from 'dns';

// Ensure DNS works for SRV connections if needed
dns.setServers(['1.1.1.1', '8.8.8.8']);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Certificate from '../src/models/Certificate.js';
import User from '../src/models/User.js';
import Counter from '../src/models/Counter.model.js';

const CERTIFICATE_TITLE_MAP = {
  offer_letter: 'Offer Letter',
  bonafide: 'Bonafide Certificate',
  bonafide_certificate: 'Bonafide Certificate',
  ojt_certificate: 'On-the-Job Training Certificate',
  experience_letter: 'Experience Certificate',
  experience_letter1: 'Experience Certificate',
  experience_letter2: 'Experience Certificate',
  completion_certificate: 'Internship Completion Certificate',
  internship_completion_certificate: 'Internship Completion Certificate',
  intern_of_month: 'Intern of the Month',
  league_winner: 'League Winner Certificate',
  custom: 'Certificate',
};

const getCertificateTitle = (certificateType) => {
  if (!certificateType) return 'Certificate';
  return (
    CERTIFICATE_TITLE_MAP[certificateType] ||
    certificateType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
};

export const generateVerifyId = () => {
  return crypto.randomBytes(6).toString('hex');
};

export async function runBackfill() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/intern_portal';
  console.log('[Backfill] Connecting to database...');
  await mongoose.connect(mongoUri);
  console.log('[Backfill] Connected successfully.');

  const year = new Date().getFullYear();
  const certificates = await Certificate.find({ status: 'finalized' }).lean();

  console.log(`[Backfill] Found ${certificates.length} finalized certificates to inspect.`);
  let updatedCount = 0;
  let skippedCount = 0;

  for (const cert of certificates) {
    const updates = {};

    // 1. Assign certificateNumber if missing
    if (!cert.certificateNumber) {
      try {
        const counter = await Counter.findOneAndUpdate(
          { _id: 'certificateNumber' },
          { $inc: { seq: 1 } },
          { new: true, upsert: true }
        );
        updates.certificateNumber = `UTS-${year}-${String(counter.seq).padStart(6, '0')}`;
      } catch (err) {
        updates.certificateNumber = `UTS-${year}-${String(Date.now()).slice(-6)}`;
      }
    }

    // 2. Assign verifyId if missing
    if (!cert.verifyId) {
      updates.verifyId = generateVerifyId();
    }

    // 3. Populate snapshot fields if missing
    let user = null;
    if (!cert.recipientName || !cert.domain) {
      if (cert.userId) {
        user = await User.findById(cert.userId).lean();
      }
    }

    if (!cert.recipientName) {
      updates.recipientName = user?.fullName || 'Intern';
    }

    if (!cert.certificateTitle) {
      updates.certificateTitle = getCertificateTitle(cert.certificateType);
    }

    if (!cert.domain) {
      updates.domain = user?.domain || '';
    }

    if (!cert.issuedAt) {
      updates.issuedAt = cert.issuedDate || cert.finalizedAt || cert.createdAt || new Date();
    }

    if (cert.isRevoked === undefined || cert.isRevoked === null) {
      updates.isRevoked = false;
    }

    if (Object.keys(updates).length > 0) {
      await Certificate.updateOne({ _id: cert._id }, { $set: updates });
      updatedCount += 1;
      console.log(`[Backfill] Updated certificate ${cert._id} (${cert.certificateNumber || updates.certificateNumber}) with:`, updates);
    } else {
      skippedCount += 1;
    }
  }

  console.log(`[Backfill] Complete! Updated: ${updatedCount}, Skipped: ${skippedCount}, Total: ${certificates.length}`);
  await mongoose.disconnect();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runBackfill()
    .then(() => {
      console.log('[Backfill] Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Backfill] Error:', err);
      process.exit(1);
    });
}
