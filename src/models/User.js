const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    id:            { type: String, required: true, unique: true },
    github_id:     { type: String, required: true, unique: true },
    username:      { type: String, required: true },
    email:         { type: String, default: null },
    avatar_url:    { type: String, default: null },
    role:          { type: String, enum: ['admin', 'analyst'], default: 'analyst' },
    is_active:     { type: Boolean, default: true },
    last_login_at: { type: Date, default: null },
    created_at:    { type: Date, default: () => new Date() },
  },
  { _id: false, versionKey: false, id: false }
);

// No duplicate indexes — unique:true on the field already creates indexes
const User = mongoose.model('User', userSchema, 'users');
module.exports = User;
