import { useEffect, useState, createContext, useContext } from 'react';
import { Routes, Route, Link, useNavigate, useParams, Navigate } from 'react-router-dom';
import { api, when } from './api.js';

const Auth = createContext();
const useAuth = () => useContext(Auth);

function Poster({ movie }) {
  if (movie.posterUrl) return <img className="poster" src={movie.posterUrl} alt={movie.title} />;
  const h = [...movie.title].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div className="poster" style={{ background: `linear-gradient(160deg, hsl(${h} 55% 38%), hsl(${(h + 50) % 360} 60% 18%))` }}>
      <span>{movie.title}<small>{movie.industry} {movie.year}</small></span>
    </div>
  );
}

function Nav() {
  const { user, logout } = useAuth();
  return (
    <header className="topbar">
      <Link to="/" className="logo">IMovies</Link>
      <nav>
        {user?.isAdmin && <Link to="/admin">Add movie</Link>}
        {user && <Link to="/bookings">My bookings</Link>}
        {user ? <button className="link" onClick={logout}>Log out ({user.name})</button> : <Link to="/login">Log in</Link>}
      </nav>
    </header>
  );
}

function Home() {
  const [movies, setMovies] = useState(null);
  const [q, setQ] = useState('');
  const [ind, setInd] = useState('All');
  useEffect(() => { api('/movies').then(setMovies).catch(() => setMovies([])); }, []);
  if (!movies) return <p className="note">Loading movies...</p>;
  const list = movies.filter((m) => (ind === 'All' || m.industry === ind) && (m.title + m.genre).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <h1>Now showing</h1>
      <input className="search form-control" placeholder="Search by title or genre" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="filters">
        {['All', 'Bollywood', 'Hollywood'].map((x) => (
          <button key={x} className={'btn btn-sm ' + (ind === x ? 'btn-warning' : 'btn-outline-warning')} onClick={() => setInd(x)}>{x}</button>
        ))}
      </div>
      {!list.length && <p className="note">No movies match your search.</p>}
      <div className="grid">
        {list.map((m) => (
          <Link key={m._id} to={`/movie/${m._id}`} className="mcard">
            <Poster movie={m} />
            <h3>{m.title}</h3>
            <p>{m.industry} - {m.genre} - {m.duration} min</p>
          </Link>
        ))}
      </div>
    </>
  );
}

function Movie() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const { user } = useAuth();
  const [pu, setPu] = useState('');
  const load = () => api('/movies/' + id).then(setData).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [id]);
  if (err) return <p className="alert alert-danger">{err}</p>;
  if (!data) return <p className="note">Loading...</p>;
  const { movie, shows } = data;
  const days = {};
  shows.forEach((s) => { (days[new Date(s.startsAt).toDateString()] ||= []).push(s); });
  return (
    <div className="detail">
      <Poster movie={movie} />
      <div>
        <h1>{movie.title}</h1>
        <p className="meta">{movie.industry} {movie.year} - {movie.genre} - {movie.duration} min</p>
        <p>{movie.description}</p>
        {user?.isAdmin && (
          <div className="poster-edit">
            <input className="form-control" placeholder="Paste poster image URL" value={pu} onChange={(e) => setPu(e.target.value)} />
            <button className="btn btn-outline-warning" onClick={async () => { await api('/movies/' + id, 'PUT', { posterUrl: pu }); setPu(''); load(); }}>Save poster</button>
          </div>
        )}
        <h2>Pick a show</h2>
        {!shows.length && <p className="note">No upcoming shows for this movie.</p>}
        {Object.entries(days).map(([day, list]) => (
          <div key={day} className="day">
            <strong>{day}</strong>
            <div className="times">
              {list.map((s) => (
                <Link key={s._id} to={`/show/${s._id}`} className="time">
                  {new Date(s.startsAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                  <small>Rs {s.price}</small>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const ROWS = 'ABCDEFGH'.split('');
const COLS = Array.from({ length: 10 }, (_, i) => i + 1);

function Seats() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [picked, setPicked] = useState([]);
  const [err, setErr] = useState('');
  const load = () => api('/shows/' + id).then((d) => { setData(d); setPicked((p) => p.filter((s) => !d.taken.includes(s))); }).catch((e) => setErr(e.message));
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [id]);
  if (!data) return <p className={err ? 'alert alert-danger' : 'note'}>{err || 'Loading...'}</p>;
  const { show, taken } = data;
  const toggle = (s) => setPicked((p) => (p.includes(s) ? p.filter((x) => x !== s) : p.length < 8 ? [...p, s] : p));
  async function book() {
    if (!user) return nav('/login');
    try {
      await api('/bookings', 'POST', { showId: id, seats: picked });
      nav('/bookings');
    } catch (e) { setErr(e.message); setPicked([]); load(); }
  }
  return (
    <>
      <h1>{show.movie.title}</h1>
      <p className="meta">{when(show.startsAt)} - Rs {show.price} per seat</p>
      <div className="screen">Screen this way</div>
      <div className="seats">
        {ROWS.map((r) => (
          <div key={r} className="seat-row">
            <b>{r}</b>
            {COLS.map((c) => {
              const s = r + c;
              const cls = taken.includes(s) ? 'seat taken' : picked.includes(s) ? 'seat picked' : 'seat';
              return <button key={s} className={cls} disabled={taken.includes(s)} onClick={() => toggle(s)} aria-label={'Seat ' + s}>{c}</button>;
            })}
          </div>
        ))}
      </div>
      <div className="legend"><span className="seat" /> Free <span className="seat picked" /> Yours <span className="seat taken" /> Booked</div>
      {err && <p className="alert alert-danger">{err}</p>}
      <div className="bar">
        <span>{picked.length ? `${picked.join(', ')} - Rs ${picked.length * show.price}` : 'Select up to 8 seats'}</span>
        <button className="btn btn-warning fw-bold" disabled={!picked.length} onClick={book}>{user ? 'Confirm booking' : 'Log in to book'}</button>
      </div>
    </>
  );
}

function Bookings() {
  const [list, setList] = useState(null);
  const load = () => api('/bookings/mine').then(setList).catch(() => setList([]));
  useEffect(() => { load(); }, []);
  if (!list) return <p className="note">Loading...</p>;
  return (
    <>
      <h1>My bookings</h1>
      {!list.length && <p className="note">No bookings yet. <Link to="/">Find a movie</Link></p>}
      {list.map((b) => (
        <div key={b._id} className="ticket">
          <div>
            <h3>{b.show.movie.title}</h3>
            <p>{when(b.show.startsAt)}</p>
            <p>Seats: <b>{b.seats.join(', ')}</b> - Total Rs {b.total}</p>
            <small>Booking ID {b._id.slice(-8)}</small>
          </div>
          <button className="btn btn-outline-danger" onClick={async () => { if (confirm('Cancel this booking?')) { await api('/bookings/' + b._id, 'DELETE'); load(); } }}>Cancel</button>
        </div>
      ))}
    </>
  );
}

function Login({ mode }) {
  const { setSession } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const reg = mode === 'register';
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    try { setSession(await api(reg ? '/auth/register' : '/auth/login', 'POST', f)); nav('/'); }
    catch (x) { setErr(x.message); }
  }
  return (
    <form className="form" onSubmit={submit}>
      <h1>{reg ? 'Create account' : 'Log in'}</h1>
      {reg && <input className="form-control" placeholder="Name" value={f.name} onChange={set('name')} required />}
      <input className="form-control" type="email" placeholder="Email" value={f.email} onChange={set('email')} required />
      <input className="form-control" type="password" placeholder="Password (6+ characters)" value={f.password} onChange={set('password')} required />
      {err && <p className="alert alert-danger">{err}</p>}
      <button className="btn btn-warning fw-bold">{reg ? 'Sign up' : 'Log in'}</button>
      <p>{reg ? <>Have an account? <Link to="/login">Log in</Link></> : <>New here? <Link to="/register">Create an account</Link></>}</p>
    </form>
  );
}

function Admin() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ title: '', industry: 'Bollywood', year: '', genre: '', duration: '', price: 200, posterUrl: '', description: '' });
  const [err, setErr] = useState('');
  if (!user?.isAdmin) return <Navigate to="/" />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    try { await api('/movies', 'POST', f); nav('/'); } catch (x) { setErr(x.message); }
  }
  return (
    <form className="form" onSubmit={submit}>
      <h1>Add a movie</h1>
      <input className="form-control" placeholder="Title" value={f.title} onChange={set('title')} required />
      <select className="form-select" value={f.industry} onChange={set('industry')}><option>Bollywood</option><option>Hollywood</option></select>
      <input className="form-control" type="number" placeholder="Release year" value={f.year} onChange={set('year')} />
      <input className="form-control" placeholder="Genre" value={f.genre} onChange={set('genre')} />
      <input className="form-control" type="number" placeholder="Duration (minutes)" value={f.duration} onChange={set('duration')} />
      <input className="form-control" type="number" placeholder="Ticket price (Rs)" value={f.price} onChange={set('price')} />
      <input className="form-control" placeholder="Poster image URL (optional)" value={f.posterUrl} onChange={set('posterUrl')} />
      <textarea className="form-control" placeholder="Description" rows="4" value={f.description} onChange={set('description')} />
      {err && <p className="alert alert-danger">{err}</p>}
      <button className="btn btn-warning fw-bold">Add movie and create shows</button>
    </form>
  );
}

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const setSession = ({ token, user }) => { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)); setUser(user); };
  const logout = () => { localStorage.clear(); setUser(null); };
  return (
    <Auth.Provider value={{ user, setSession, logout }}>
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movie/:id" element={<Movie />} />
          <Route path="/show/:id" element={<Seats />} />
          <Route path="/bookings" element={user ? <Bookings /> : <Navigate to="/login" />} />
          <Route path="/login" element={<Login mode="login" />} />
          <Route path="/register" element={<Login mode="register" />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<p className="note">Page not found.</p>} />
        </Routes>
      </main>
    </Auth.Provider>
  );
}
