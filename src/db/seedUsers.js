require('dotenv').config();
const { v7: uuidv7 } = require('uuid');
const connectDB      = require('./connection');
const User           = require('../models/User');
const { issueTokens } = require('../utils/tokenService');

async function seedUsers() {
  await connectDB();

  // ── Admin user ─────────────────────────────────────────────────────────────
  let admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    // Use collection.insertOne directly — avoids Mongoose .save() which
    // requires _id but our User schema has _id: false
    const adminDoc = {
      id:            uuidv7(),
      github_id:     'grader_admin_001',
      username:      'grader_admin',
      email:         'admin@insighta.test',
      avatar_url:    null,
      role:          'admin',
      is_active:     true,
      last_login_at: new Date(),
      created_at:    new Date(),
    };
    await User.collection.insertOne(adminDoc);
    admin = await User.findOne({ github_id: 'grader_admin_001' });
    console.log('✅ Admin user created');
  } else {
    console.log('ℹ️  Admin user already exists:', admin.username);
  }

  // ── Analyst user ───────────────────────────────────────────────────────────
  let analyst = await User.findOne({ github_id: 'grader_analyst_001' });
  if (!analyst) {
    const analystDoc = {
      id:            uuidv7(),
      github_id:     'grader_analyst_001',
      username:      'grader_analyst',
      email:         'analyst@insighta.test',
      avatar_url:    null,
      role:          'analyst',
      is_active:     true,
      last_login_at: new Date(),
      created_at:    new Date(),
    };
    await User.collection.insertOne(analystDoc);
    analyst = await User.findOne({ github_id: 'grader_analyst_001' });
    console.log('✅ Analyst user created');
  } else {
    console.log('ℹ️  Analyst user already exists:', analyst.username);
  }

  // ── Issue tokens ───────────────────────────────────────────────────────────
  const adminTokens   = await issueTokens(admin);
  const analystTokens = await issueTokens(analyst);

  console.log('\n════════════════════════════════════════════════════════');
  console.log('COPY THESE INTO YOUR SUBMISSION FORM:');
  console.log('════════════════════════════════════════════════════════');
  console.log('\nAdmin Access Token (Admin Test Token):');
  console.log(adminTokens.access_token);
  console.log('\nAdmin Refresh Token (Refresh Test Token):');
  console.log(adminTokens.refresh_token);
  console.log('\nAnalyst Access Token (Analyst Test Token):');
  console.log(analystTokens.access_token);
  console.log('\n════════════════════════════════════════════════════════\n');

  process.exit(0);
}

seedUsers().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
