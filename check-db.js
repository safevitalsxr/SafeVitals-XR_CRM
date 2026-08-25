require('dotenv').config();
const mongoose = require('mongoose');
async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const employees = await db.collection('employees').find().toArray();
  console.log('Employees:', JSON.stringify(employees, null, 2));
  const users = await db.collection('users').find().toArray();
  console.log('Users:', JSON.stringify(users, null, 2));
  process.exit(0);
}
check();
