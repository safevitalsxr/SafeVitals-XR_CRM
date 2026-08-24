require('dotenv').config();
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function run() {
  const uri = process.env.MONGODB_URI;
  const email = process.argv[2];
  const newPassword = process.argv[3];
  if (!email || !newPassword) {
    console.error('Usage: node update_pass.js <email> <newPassword>');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('test');

    const passwordHash = await bcrypt.hash(newPassword, 12);

    const result = await db.collection('users').updateOne(
      { email: email.toLowerCase() },
      { $set: { passwordHash } }
    );
    console.log(`Matched ${result.matchedCount}, modified ${result.modifiedCount} for ${email}`);
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
}
run();
