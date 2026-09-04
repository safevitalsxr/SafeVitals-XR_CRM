const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    const user = await db.collection('users').findOne({ email: 'moviefinderforyou@gmail.com' });
    if (!user) {
      console.log('User NOT found!');
    } else {
      console.log('User found:', user.email);
      console.log('Status:', user.status);
      console.log('mustChangePassword:', user.mustChangePassword);
      console.log('Has passwordHash:', !!user.passwordHash);
      
      if (user.passwordHash) {
        const isValid = await bcrypt.compare('Password123!', user.passwordHash);
        console.log('Password123! is valid:', isValid);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

checkUser();
