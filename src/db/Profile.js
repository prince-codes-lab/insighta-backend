const mongoose = require('mongoose');

/**
 * Profile schema — mirrors the table spec exactly.
 *
 * _id is disabled; we use our own `id` field (UUID v7 string) as
 * the primary key so the response shape matches the spec.
 */
const profileSchema = new mongoose.Schema(
  {
    id: {
      type:     String,
      required: true,
      unique:   true,
    },
    name: {
      type:     String,
      required: true,
      unique:   true,
      trim:     true,
    },
    gender: {
      type:     String,
      required: true,
      enum:     ['male', 'female'],
    },
    gender_probability: {
      type:     Number,
      required: true,
    },
    age: {
      type:     Number,
      required: true,
    },
    age_group: {
      type:     String,
      required: true,
      enum:     ['child', 'teenager', 'adult', 'senior'],
    },
    country_id: {
      type:     String,
      required: true,
      uppercase: true,
      minlength: 2,
      maxlength: 2,
    },
    country_name: {
      type:     String,
      required: true,
    },
    country_probability: {
      type:     Number,
      required: true,
    },
    created_at: {
      type:    Date,
      default: () => new Date(),
    },
  },
  {
    // Use our own `id` field; don't let Mongoose create _id
    _id: false,

    // Don't add a __v versioning field to documents
    versionKey: false,

    // Tell Mongoose which field to treat as the document identifier
    id: false,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Single-field indexes for the most common filter columns
profileSchema.index({ gender:     1 });
profileSchema.index({ age_group:  1 });
profileSchema.index({ country_id: 1 });
profileSchema.index({ age:        1 });
profileSchema.index({ created_at: 1 });
profileSchema.index({ gender_probability:  1 });
profileSchema.index({ country_probability: 1 });

// Compound indexes for the most common multi-filter combinations
profileSchema.index({ gender: 1, country_id: 1 });
profileSchema.index({ age_group: 1, gender: 1 });
profileSchema.index({ gender: 1, age: 1 });

const Profile = mongoose.model('Profile', profileSchema, 'profiles');

module.exports = Profile;
