import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectToDB from '../src/config/database.js';
import User from '../src/models/User.js';
import CertificateRequest from '../src/models/CertificateRequest.js';

const DOMAINS = ['Web Development', 'Data Science', 'UI/UX Design', 'Cloud & DevOps', 'Cybersecurity', 'Mobile App Development'];
const STATUSES = ['pending', 'approved', 'rejected', 'completed'];
const CERT_TYPES = ['completion_certificate', 'offer_letter', 'bonafide', 'experience_letter', 'intern_of_month'];

async function seedRealisticVolume() {
  const internCount = parseInt(process.env.INTERN_COUNT || '500', 10);
  const requestCount = parseInt(process.env.REQUEST_COUNT || '3000', 10);

  console.log(`=== Starting Realistic Volume Seeding ===`);
  console.log(`Target: ${internCount} Interns, ${requestCount} Requests`);

  await connectToDB();

  try {
    // 1. Ensure at least 3 Team Leaders exist
    let teamLeaders = await User.find({ role: 'teamleader' }).select('_id fullName email');
    if (teamLeaders.length === 0) {
      console.log('Creating 3 test Team Leaders...');
      const createdTLs = await User.insertMany([
        { fullName: 'TL Sarah Connor', email: 'tl.sarah@uptoskill.test', role: 'teamleader', password: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890' },
        { fullName: 'TL John Miller', email: 'tl.john@uptoskill.test', role: 'teamleader', password: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890' },
        { fullName: 'TL Priya Sharma', email: 'tl.priya@uptoskill.test', role: 'teamleader', password: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890' },
      ]);
      teamLeaders = createdTLs;
    }

    // 2. Prepare 500 Interns in bulk
    console.log(`Generating ${internCount} intern documents...`);
    const interns = [];
    const timestamp = Date.now();

    for (let i = 1; i <= internCount; i++) {
      const domain = DOMAINS[i % DOMAINS.length];
      const tl = teamLeaders[i % teamLeaders.length];
      const code = `UTS-${String(timestamp).slice(-4)}-${String(i).padStart(4, '0')}`;
      interns.push({
        fullName: `Volume Intern ${i}`,
        email: `volume.intern.${timestamp}.${i}@uptoskill.test`,
        internCode: code,
        role: 'intern',
        domain,
        isArchived: i % 20 === 0, // 5% archived
        password: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
        passwordSetAt: i % 2 === 0 ? new Date() : null,
        mobileNo: `+9198765${String(i).padStart(5, '0')}`,
        startDate: new Date(Date.now() - 60 * 86400000),
        endDate: new Date(Date.now() + 30 * 86400000),
        internshipDetails: {
          teamLeader: tl._id,
          teamLeaderId: tl._id,
          teamleaderEmail: tl.email,
          status: i % 10 === 0 ? 'completed' : 'ongoing'
        }
      });
    }

    // Insert interns in batches
    console.log('Inserting interns into database in batches of 200...');
    const insertedInterns = [];
    for (let b = 0; b < interns.length; b += 200) {
      const batch = interns.slice(b, b + 200);
      const res = await User.insertMany(batch);
      insertedInterns.push(...res);
    }
    console.log(`Successfully inserted ${insertedInterns.length} interns.`);

    // 3. Prepare 3000 Certificate Requests
    console.log(`Generating ${requestCount} certificate requests...`);
    const requests = [];
    for (let j = 1; j <= requestCount; j++) {
      const intern = insertedInterns[j % insertedInterns.length];
      const status = STATUSES[j % STATUSES.length];
      const certType = CERT_TYPES[j % CERT_TYPES.length];
      const reqNumber = `REQ-VOL-${timestamp}-${String(j).padStart(5, '0')}`;

      requests.push({
        requestNumber: reqNumber,
        userId: intern._id,
        internCode: intern.internCode,
        certificateType: certType,
        status,
        requestedAt: new Date(Date.now() - (j % 90) * 86400000),
        forwardedBy: status !== 'pending' ? intern.internshipDetails?.teamLeaderId : undefined,
        forwardedAt: status !== 'pending' ? new Date(Date.now() - (j % 80) * 86400000) : undefined,
        completedAt: status === 'completed' ? new Date(Date.now() - (j % 70) * 86400000) : undefined,
      });
    }

    // Insert requests in batches
    console.log('Inserting requests into database in batches of 500...');
    for (let b = 0; b < requests.length; b += 500) {
      const batch = requests.slice(b, b + 500);
      await CertificateRequest.insertMany(batch);
    }
    console.log(`Successfully inserted ${requests.length} certificate requests.`);

    // 4. Run Query Explain Plans to verify Index Usage
    console.log('\n--- Running MongoDB Explain Plans to verify Indexes ---');

    // Query 1: Admin Request List filter by status and sorted by requestedAt
    const explain1 = await CertificateRequest.find({ status: 'pending' })
      .sort({ requestedAt: -1 })
      .limit(20)
      .explain('executionStats');

    console.log('Query 1: { status: "pending" } sort { requestedAt: -1 }');
    const stage1 = explain1.executionStats?.executionStages?.stage || explain1.executionStats?.stage;
    console.log(`Execution Stage: ${stage1} (Docs examined: ${explain1.executionStats?.totalDocsExamined}, Keys examined: ${explain1.executionStats?.totalKeysExamined})`);

    // Query 2: Team Leader Intern Lookup
    const randomTLId = teamLeaders[0]._id;
    const explain2 = await User.find({
      role: 'intern',
      'internshipDetails.teamLeaderId': randomTLId
    })
      .select('fullName email domain internshipDetails')
      .lean()
      .explain('executionStats');

    console.log('Query 2: { role: "intern", "internshipDetails.teamLeaderId": tlId }');
    const stage2 = explain2.executionStats?.executionStages?.stage || explain2.executionStats?.stage;
    console.log(`Execution Stage: ${stage2} (Docs examined: ${explain2.executionStats?.totalDocsExamined}, Keys examined: ${explain2.executionStats?.totalKeysExamined})`);

    console.log('\n=== Seeding & Index Verification Completed Successfully ===');
  } catch (err) {
    console.error('Volume seeding error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
  }
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('seedRealisticVolume.js')) {
  seedRealisticVolume();
}

export default seedRealisticVolume;

