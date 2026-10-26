const { Schema, model } = require('mongoose');
const ref = (m) => ({ type: Schema.Types.ObjectId, ref: m });

exports.User = model('User', new Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  password: String,
  isAdmin: { type: Boolean, default: false },
}));
exports.Movie = model('Movie', new Schema({
  title: String, genre: String, industry: String, year: Number, duration: Number, description: String, posterUrl: String,
}));
exports.Show = model('Show', new Schema({ movie: ref('Movie'), startsAt: Date, price: Number }));
exports.Booking = model('Booking', new Schema(
  { user: ref('User'), show: ref('Show'), seats: [String], total: Number },
  { timestamps: true }
));
