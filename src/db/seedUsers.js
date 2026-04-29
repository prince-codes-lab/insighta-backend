require('dotenv').config();
const { v7: uuidv7 } = require('uuid');
const connectDB      = require('./connection');
const User           = require('../models/User');
const { issueTokens } = require('../utils/tokenService');

async function seedUsers() {
  await connectDB();

  // ── Admin user ────────────────────────────────────────────────────────────
  let admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    admin = await User.create({
      id:            uuidv7(),
      github_id:     'grader_admin_001',
      username:      'grader_admin',
      email:         'admin@insighta.test',
      avatar_url:    null,
      role:          'admin',
      is_active:     true,
      last_login_at: new Date(),
      created_at:    new Date(),
    });
    console.log('✅ Admin user created');
  } else {
    console.log('ℹ️  Admin user already exists');
  }

  // ── Analyst user ──────────────────────────────────────────────────────────
  let analyst = await User.findOne({ role: 'analyst', github_id: 'grader_analyst_001' });
  if (!analyst) {
    analyst = await User.create({
      id:            uuidv7(),
      github_id:     'grader_analyst_001',
      username:      'grader_analyst',
      email:         'analyst@insighta.test',
      avatar_url:    null,
      role:          'analyst',
      is_active:     true,
      last_login_at: new Date(),
      created_at:    new Date(),
    });
    console.log('✅ Analyst user created');
  } else {
    console.log('ℹ️  Analyst user already exists');
  }

  // ── Issue tokens and print them ───────────────────────────────────────────
  const adminTokens   = await issueTokens(admin);
  const analystTokens = await issueTokens(analyst);

  console.log('\n════════════════════════════════════════════════════════');
  console.log('COPY THESE INTO YOUR SUBMISSION FORM:');
  console.log('════════════════════════════════════════════════════════');
  console.log('\nAdmin Access Token (paste as "Admin Test Token"):');
  console.log(adminTokens.access_token);
  console.log('\nAdmin Refresh Token (paste as "Refresh Test Token"):');
  console.log(adminTokens.refresh_token);
  console.log('\nAnalyst Access Token (paste as "Analyst Test Token"):');
  console.log(analystTokens.access_token);
  console.log('\n════════════════════════════════════════════════════════\n');

  process.exit(0);
}

seedUsers().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
