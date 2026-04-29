const mongoose = require('mongoose');
require('dotenv').config();

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌  MONGODB_URI is not set. Add it to your .env file.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('✅  MongoDB connected:', mongoose.connection.host);
  } catch (err) {
    console.error('❌  MongoDB connection failed:', err.message);
    process.exit(1);
  }

  // Log any errors that occur AFTER the initial connection
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB runtime error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️   MongoDB disconnected.');
  });
}

module.exports = connectDB;
