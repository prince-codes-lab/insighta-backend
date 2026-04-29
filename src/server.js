require('dotenv').config();
const app       = require('./app');
const connectDB = require('./db/connection');

const PORT = process.env.PORT || 3000;

async function start() {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`🚀  Insighta Labs+ API on port ${PORT}`);
    console.log('    Auth   : GET  /auth/github  POST /auth/refresh  POST /auth/logout  GET /auth/me');
    console.log('    API    : GET  /api/profiles  GET /api/profiles/search  GET /api/profiles/export');
    console.log('    API    : POST /api/profiles  (admin only)');
    console.log('    Health : GET  /health');
  });

  // Graceful shutdown — close DB connection before exit
  const shutdown = async (signal) => {
    console.log(`\n${signal} received — shutting down gracefully`);
    server.close(async () => {
      const mongoose = require('mongoose');
      await mongoose.connection.close();
      console.log('MongoDB connection closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

start();
