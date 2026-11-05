import User from '../models/User.js';

// Generates a non-sequential code so intern codes can't be guessed (INT-4X9K2Q style)
export const generateInternCode = async () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/I/1 to avoid confusion
  let code;
  let exists = true;

  while (exists) {
    const random = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    code = `INT-${random}`;
    exists = await User.exists({ internCode: code });
  }

  return code;
};