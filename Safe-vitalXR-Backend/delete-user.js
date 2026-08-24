require('dotenv').config();
const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(uri);
  const email = (process.argv[2] || '').toLowerCase();
  if (!email) {
    console.error('Usage: node delete-user.js <email>');
    process.exit(1);
  }

  const users = mongoose.connection.collection('users');
  const otps = mongoose.connection.collection('otps');

  const uRes = await users.deleteMany({ email });
  const oRes = await otps.deleteMany({ email });

  console.log(`Deleted ${uRes.deletedCount} users and ${oRes.deletedCount} OTPs for ${email}`);
  process.exit(0);
}
run().catch(console.error);
