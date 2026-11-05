import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import connectToDB from '../src/config/database.js';
import User from '../src/models/User.js';

/**
 * Creates the initial Admin user from environment variables or CLI arguments.
 * Usage:
 *   ADMIN_EMAIL=admin@uptoskill.com ADMIN_PASSWORD=StrongPassword123 node scripts/createAdmin.js
 * or
 *   node scripts/createAdmin.js admin@uptoskill.com StrongPassword123 "Super Admin"
 */
async function createAdmin() {
  const email = (process.env.ADMIN_EMAIL || process.argv[2] || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || process.argv[3] || '';
  const fullName = (process.env.ADMIN_NAME || process.argv[4] || 'System Administrator').trim();

  if (!email || !password) {
    console.error('Error: Admin email and password must be provided.');
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in environment or pass them as arguments:');
    console.error('node scripts/createAdmin.js <email> <password> [fullName]');
    process.exit(1);
  }

  // Basic email pattern check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error(`Error: Invalid email format: "${email}"`);
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Error: Admin password must be at least 8 characters long.');
    process.exit(1);
  }

  console.log(`Connecting to database to provision admin: ${email}...`);
  await connectToDB();

  try {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (existingUser.role === 'admin') {
        console.log(`Admin account for "${email}" already exists (ID: ${existingUser._id}).`);
        // If force update requested or env flag set
        if (process.env.FORCE_PASSWORD_RESET === 'true') {
          existingUser.password = await bcrypt.hash(password, 10);
          existingUser.passwordSetAt = new Date();
          await existingUser.save();
          console.log(`Password updated successfully for existing Admin "${email}".`);
        } else {
          console.log('Skipping creation. To update password, run with FORCE_PASSWORD_RESET=true.');
        }
      } else {
        console.warn(`User "${email}" already exists with role: "${existingUser.role}". Promoting to admin...`);
        existingUser.role = 'admin';
        existingUser.password = await bcrypt.hash(password, 10);
        existingUser.passwordSetAt = new Date();
        await existingUser.save();
        console.log(`User "${email}" promoted to Admin successfully.`);
      }
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const newAdmin = await User.create({
        fullName,
        email,
        password: hashedPassword,
        passwordSetAt: new Date(),
        role: 'admin',
        isArchived: false
      });

      console.log(`First Admin user created successfully:`);
      console.log(`- ID: ${newAdmin._id}`);
      console.log(`- Name: ${newAdmin.fullName}`);
      console.log(`- Email: ${newAdmin.email}`);
      console.log(`- Role: ${newAdmin.role}`);
    }
  } catch (err) {
    console.error('Failed to create admin user:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
  }
}

createAdmin();

