import cron from 'node-cron';
import User from '../models/User.js';

const BATCH_SIZE = 100;
const dryRunEnabled = () => String(process.env.DRY_RUN).toLowerCase() === 'true';

export async function runInternshipStatusJob({ dryRun = dryRunEnabled() } = {}) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  let changed = 0;

  for (const [from, to, filter] of [
    ['upcoming', 'ongoing', { startDate: { $lt: new Date(today.getTime() + 86400000) } }],
    ['ongoing', 'completed', { endDate: { $lt: today } }],
  ]) {
    let lastId = null;
    while (true) {
      const query = {
        role: 'intern',
        isArchived: { $ne: true },
        'internshipDetails.status': from,
        ...filter,
        ...(lastId ? { _id: { $gt: lastId } } : {}),
      };
      const batch = await User.find(query).select('_id fullName').sort({ _id: 1 }).limit(BATCH_SIZE).lean();
      if (!batch.length) break;
      lastId = batch[batch.length - 1]._id;
      changed += batch.length;

      for (const intern of batch) {
        const message = `[internship-status] ${dryRun ? 'DRY RUN: would update' : 'updated'} ${intern._id} (${from} -> ${to})`;
        console.log(message);
        // TODO: logAction for the status transition.
      }

      if (!dryRun) {
        await User.updateMany(
          { _id: { $in: batch.map(({ _id }) => _id) }, 'internshipDetails.status': from },
          { $set: { 'internshipDetails.status': to } }
        );
      }
    }
  }

  return { changed, dryRun };
}

export function scheduleInternshipStatusJob() {
  return cron.schedule('0 2 * * *', () => {
    runInternshipStatusJob().catch((error) => console.error('[internship-status] job failed:', error));
  }, { timezone: process.env.JOBS_TIMEZONE || 'Asia/Kolkata' });
}
