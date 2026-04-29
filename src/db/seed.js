require('dotenv').config();
const fs        = require('fs');
const path      = require('path');
const { v7: uuidv7 } = require('uuid');
const connectDB = require('./connection');
const Profile   = require('./Profile');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Maps a raw JSON record to the exact schema shape.
 * The seed file uses snake_case field names that match the schema directly,
 * so this mainly adds the generated `id` and a default `created_at`.
 */
function normalise(raw) {
  return {
    id:                  uuidv7(),
    name:                (raw.name || '').toString().trim(),
    gender:              (raw.gender || '').toLowerCase(),
    gender_probability:  parseFloat(raw.gender_probability),
    age:                 parseInt(raw.age, 10),
    age_group:           (raw.age_group || '').toLowerCase(),
    country_id:          (raw.country_id || '').toUpperCase(),
    country_name:        raw.country_name || '',
    country_probability: parseFloat(raw.country_probability),
    created_at:          new Date(),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
  // 1. Connect to MongoDB first
  await connectDB();

  // 2. Load records — prefer a local file path, fall back to a URL
  const seedPath = process.env.SEED_FILE_PATH;
  const seedUrl  = process.env.SEED_FILE_URL;

  if (!seedPath && !seedUrl) {
    console.error('❌  Set either SEED_FILE_PATH (local file) or SEED_FILE_URL in your .env.');
    process.exit(1);
  }

  let records;

  if (seedPath) {
    // ── Local file ───────────────────────────────────────────────────────────
    console.log(`\nReading seed data from local file:\n  ${seedPath}\n`);
    try {
      const raw = JSON.parse(fs.readFileSync(path.resolve(seedPath), 'utf8'));
      records = Array.isArray(raw) ? raw : (raw.profiles ?? raw.data ?? []);
    } catch (err) {
      console.error('❌  Failed to read seed file:', err.message);
      process.exit(1);
    }
  } else {
    // ── Remote URL ───────────────────────────────────────────────────────────
    console.log(`\nFetching seed data from:\n  ${seedUrl}\n`);
    try {
      const res = await fetch(seedUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const raw = await res.json();
      records = Array.isArray(raw) ? raw : (raw.profiles ?? raw.data ?? []);
    } catch (err) {
      console.error('❌  Failed to fetch seed file:', err.message);
      process.exit(1);
    }
  }

  console.log(`Seeding ${records.length} profiles into MongoDB…\n`);

  // 4. Normalise all records
  const docs = records
    .map(normalise)
    .filter(d => d.name); // skip any blank-name records

  // 5. Insert in batches of 200, silently skipping duplicates
  const CHUNK_SIZE = 200;
  let inserted = 0;
  let skipped  = 0;

  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const chunk = docs.slice(i, i + CHUNK_SIZE);
    try {
      const result = await Profile.insertMany(chunk, {
        ordered:             false, // continue on error instead of stopping
        rawResult:           true,
      });
      inserted += result.insertedCount;
    } catch (err) {
      // BulkWriteError code 11000 = duplicate key — these are expected on re-seed
      if (err.code === 11000 || err.name === 'MongoBulkWriteError') {
        inserted += err.result?.nInserted ?? 0;
        skipped  += chunk.length - (err.result?.nInserted ?? 0);
      } else {
        console.error('❌  Unexpected error during batch insert:', err.message);
        process.exit(1);
      }
    }

    const progress = Math.min(i + CHUNK_SIZE, docs.length);
    process.stdout.write(`\r  Progress: ${progress}/${docs.length}`);
  }

  console.log(`\n\n✅  Seeding complete!`);
  console.log(`    Inserted : ${inserted}`);
  console.log(`    Skipped  : ${skipped} (already exist)\n`);

  process.exit(0);
}

seed();
