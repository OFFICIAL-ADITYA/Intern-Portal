import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

// Ensure DNS works for SRV connections if needed
dns.setServers(['1.1.1.1', '8.8.8.8']);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import User from '../src/models/User.js';

export async function runBackfill() {
  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    'mongodb://localhost:27017/intern_portal';

  console.log('[Backfill TL] Connecting to database...');
  await mongoose.connect(mongoUri);
  console.log('[Backfill TL] Connected successfully.');

  const interns = await User.find({ role: 'intern' });
  console.log(`[Backfill TL] Found ${interns.length} interns to inspect.`);

  let updatedCount = 0;
  let alreadyLinkedCount = 0;
  let unmatchedCount = 0;
  const unmatchedList = [];

  for (const intern of interns) {
    const details = intern.internshipDetails || {};
    const tlEmail = details.teamleaderEmail?.trim().toLowerCase();

    if (!tlEmail) {
      // Check if already has teamLeaderId
      if (details.teamLeaderId || details.teamLeader) {
        alreadyLinkedCount++;
      } else {
        unmatchedCount++;
        unmatchedList.push({
          internId: intern._id,
          fullName: intern.fullName,
          internCode: intern.internCode,
          email: intern.email,
          reason: 'No teamleaderEmail specified'
        });
      }
      continue;
    }

    const tl = await User.findOne({
      role: 'teamleader',
      email: tlEmail
    });

    if (tl) {
      const currentId = details.teamLeaderId?.toString();
      if (currentId !== tl._id.toString()) {
        if (!intern.internshipDetails) intern.internshipDetails = {};
        intern.internshipDetails.teamLeaderId = tl._id;
        intern.internshipDetails.teamLeader = tl._id;
        await intern.save();
        updatedCount++;
      } else {
        alreadyLinkedCount++;
      }
    } else {
      unmatchedCount++;
      unmatchedList.push({
        internId: intern._id,
        fullName: intern.fullName,
        internCode: intern.internCode,
        email: intern.email,
        teamleaderEmail: tlEmail,
        reason: `No team leader found with email: ${tlEmail}`
      });
    }
  }

  console.log('==============================================');
  console.log('       TEAM LEADER BACKFILL REPORT            ');
  console.log('==============================================');
  console.log(`Total Interns Inspected:   ${interns.length}`);
  console.log(`Successfully Updated:       ${updatedCount}`);
  console.log(`Already Properly Linked:    ${alreadyLinkedCount}`);
  console.log(`Unmatched Interns:          ${unmatchedCount}`);
  if (unmatchedList.length > 0) {
    console.log('\nUnmatched Interns Details:');
    console.table(unmatchedList);
  }
  console.log('==============================================');

  return {
    total: interns.length,
    updated: updatedCount,
    alreadyLinked: alreadyLinkedCount,
    unmatched: unmatchedCount,
    unmatchedList
  };
}

// Execute standalone if called directly
if (process.argv[1] && process.argv[1].endsWith('backfillTeamLeaderId.js')) {
  runBackfill()
    .then(() => {
      console.log('[Backfill TL] Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Backfill TL] Error:', err);
      process.exit(1);
    });
}
