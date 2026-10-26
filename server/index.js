require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { User, Movie, Show, Booking } = require('./models');
const { seed, addShows } = require('./seed');

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = process.env.JWT_SECRET || 'dev_secret';
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => res.status(500).json({ message: e.message }));
const sign = (u) => jwt.sign({ id: u._id, isAdmin: u.isAdmin }, SECRET, { expiresIn: '7d' });
const safe = (u) => ({ id: u._id, name: u.name, email: u.email, isAdmin: u.isAdmin });

function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try { req.user = jwt.verify(token, SECRET); next(); }
  catch { res.status(401).json({ message: 'Please log in first' }); }
}
const admin = (req, res, next) =>
  req.user.isAdmin ? next() : res.status(403).json({ message: 'Admins only' });

// ---- Auth ----
app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6)
    return res.status(400).json({ message: 'Name, email and a 6+ character password are required' });
  if (await User.findOne({ email: email.toLowerCase() }))
    return res.status(400).json({ message: 'Email is already registered' });
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
  res.json({ token: sign(user), user: safe(user) });
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const user = await User.findOne({ email: (req.body.email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(req.body.password || '', user.password)))
    return res.status(400).json({ message: 'Wrong email or password' });
  res.json({ token: sign(user), user: safe(user) });
}));

// ---- Movies ----
app.get('/api/movies', wrap(async (req, res) => res.json(await Movie.find().sort({ _id: -1 }))));

app.get('/api/movies/:id', wrap(async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie) return res.status(404).json({ message: 'Movie not found' });
  const shows = await Show.find({ movie: movie._id, startsAt: { $gt: new Date() } }).sort('startsAt');
  res.json({ movie, shows });
}));

app.post('/api/movies', auth, admin, wrap(async (req, res) => {
  const { title, genre, industry, year, duration, description, posterUrl, price } = req.body;
  if (!title) return res.status(400).json({ message: 'Title is required' });
  const movie = await Movie.create({ title, genre, industry, year, duration, description, posterUrl });
  await addShows(movie, Number(price) || 200);
  res.json(movie);
}));

app.put('/api/movies/:id', auth, admin, wrap(async (req, res) => {
  const movie = await Movie.findByIdAndUpdate(req.params.id, { posterUrl: req.body.posterUrl }, { new: true });
  if (!movie) return res.status(404).json({ message: 'Movie not found' });
  res.json(movie);
}));

// ---- Shows & seats ----
app.get('/api/shows/:id', wrap(async (req, res) => {
  const show = await Show.findById(req.params.id).populate('movie');
  if (!show) return res.status(404).json({ message: 'Show not found' });
  const bookings = await Booking.find({ show: show._id });
  res.json({ show, taken: bookings.flatMap((b) => b.seats) });
}));

// ---- Bookings ----
app.post('/api/bookings', auth, wrap(async (req, res) => {
  const { showId, seats } = req.body;
  if (!Array.isArray(seats) || !seats.length || seats.length > 8)
    return res.status(400).json({ message: 'Pick between 1 and 8 seats' });
  const show = await Show.findById(showId);
  if (!show) return res.status(404).json({ message: 'Show not found' });
  const taken = (await Booking.find({ show: showId })).flatMap((b) => b.seats);
  const clash = seats.filter((s) => taken.includes(s));
  if (clash.length) return res.status(409).json({ message: `Already booked: ${clash.join(', ')}` });
  const booking = await Booking.create({ user: req.user.id, show: showId, seats, total: seats.length * show.price });
  res.json(booking);
}));

app.get('/api/bookings/mine', auth, wrap(async (req, res) => {
  const list = await Booking.find({ user: req.user.id }).sort('-createdAt')
    .populate({ path: 'show', populate: { path: 'movie' } });
  res.json(list.filter((b) => b.show));
}));

app.delete('/api/bookings/:id', auth, wrap(async (req, res) => {
  const b = await Booking.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!b) return res.status(404).json({ message: 'Booking not found' });
  res.json({ ok: true });
}));

// ---- Serve React build in production ----
const dist = path.join(__dirname, '../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/imovies')
  .then(async () => { await seed(); app.listen(PORT, () => console.log('Server running on port ' + PORT)); })
  .catch((e) => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
