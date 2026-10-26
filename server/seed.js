const bcrypt = require('bcryptjs');
const { User, Movie, Show } = require('./models');

const TIMES = [[10, 30], [14, 0], [18, 30], [21, 45]];
const OLD_DEMO = ['Midnight Express Run', 'The Last Monsoon', 'Laugh Track', 'Orbit Seven', 'Haunted Wi-Fi', 'Pocket Money'];

const B = (title, year, genre, duration, description) => ({ title, year, genre, duration, description, industry: 'Bollywood' });
const H = (title, year, genre, duration, description) => ({ title, year, genre, duration, description, industry: 'Hollywood' });

const CATALOG = [
  B('Jawan', 2023, 'Action', 169, 'A mysterious man with a hidden past sets out to fix a corrupt system, backed by a team of fearless women.'),
  B('Pathaan', 2023, 'Action', 146, 'An exiled secret agent returns to stop a private army from launching a deadly attack on India.'),
  B('3 Idiots', 2009, 'Comedy', 170, 'Three engineering students question the rat race of marks and degrees while searching for a lost friend.'),
  B('Dangal', 2016, 'Sports', 161, 'A former wrestler trains his daughters to take on the best wrestlers in the country.'),
  B('Stree 2', 2024, 'Horror Comedy', 149, 'The town of Chanderi faces a new and scarier threat, and its unlikely heroes have to team up again.'),
  B('Dilwale Dulhania Le Jayenge', 1995, 'Romance', 189, 'Two travellers fall in love on a trip across Europe, but one family tradition stands in their way.'),
  B('Lagaan', 2001, 'Drama', 224, 'Villagers take up a cricket match against British officers to escape a crushing tax.'),
  B('Bajrangi Bhaijaan', 2015, 'Drama', 159, 'A kind-hearted man goes to great lengths to take a lost, speechless child back to her family.'),
  B('Kal Ho Naa Ho', 2003, 'Romance', 186, 'A cheerful new neighbour changes the life of a New York family and a love story gets complicated.'),
  B('Sholay', 1975, 'Action', 204, 'Two small-time crooks are hired by a former police officer to catch a feared bandit.'),
  H('Oppenheimer', 2023, 'Drama', 180, 'The story of the physicist who led the team that built the first atomic bomb, and what it cost him.'),
  H('Inception', 2010, 'Sci-Fi', 148, 'A thief who steals secrets from dreams is offered one last job: planting an idea in someone\'s mind.'),
  H('Interstellar', 2014, 'Sci-Fi', 169, 'Explorers travel through a wormhole in search of a new home for humanity.'),
  H('The Dark Knight', 2008, 'Action', 152, 'Batman faces the Joker, a criminal mastermind who wants to push Gotham into chaos.'),
  H('Avengers: Endgame', 2019, 'Action', 181, 'The surviving heroes make a final attempt to undo the damage done by Thanos.'),
  H('Dune: Part Two', 2024, 'Sci-Fi', 166, 'Paul Atreides joins the desert people of Arrakis to take revenge and fight for the future of the planet.'),
  H('Top Gun: Maverick', 2022, 'Action', 131, 'After thirty years, a veteran pilot trains a new group of graduates for a nearly impossible mission.'),
  H('Spider-Man: No Way Home', 2021, 'Action', 148, 'Peter Parker asks for help to make the world forget his secret, and the plan goes wrong.'),
  H('Barbie', 2023, 'Comedy', 114, 'Barbie leaves Barbieland for the real world and discovers what it means to be human.'),
  H('Avatar: The Way of Water', 2022, 'Sci-Fi', 192, 'Jake Sully and his family leave their forest home and find shelter among the reef clans of Pandora.'),
  H('Titanic', 1997, 'Romance', 194, 'A young couple from different worlds fall in love aboard the ill-fated ocean liner.'),
];

// Adds any missing show times for the next 4 days (never duplicates existing ones)
async function addShows(movie, price = 200) {
  const have = new Set((await Show.find({ movie: movie._id }, 'startsAt')).map((s) => +s.startsAt));
  const shows = [];
  for (let d = 0; d < 4; d++)
    for (const [h, m] of TIMES) {
      const t = new Date(); t.setDate(t.getDate() + d); t.setHours(h, m, 0, 0);
      if (t > new Date() && !have.has(+t)) shows.push({ movie: movie._id, startsAt: t, price });
    }
  if (shows.length) await Show.insertMany(shows);
}

async function seed() {
  if (!(await User.findOne({ isAdmin: true })))
    await User.create({ name: 'Admin', email: 'admin@imovies.com', password: await bcrypt.hash('admin123', 10), isAdmin: true });

  // remove the old placeholder movies from the first version
  const old = await Movie.find({ title: { $in: OLD_DEMO } });
  if (old.length) {
    const ids = old.map((m) => m._id);
    await Show.deleteMany({ movie: { $in: ids } });
    await Movie.deleteMany({ _id: { $in: ids } });
  }

  for (const m of CATALOG)
    if (!(await Movie.findOne({ title: m.title }))) await Movie.create(m);

  // keep every movie supplied with upcoming shows, so the site never goes empty
  for (const m of await Movie.find()) {
    const last = await Show.findOne({ movie: m._id }).sort('-startsAt');
    await addShows(m, last ? last.price : m.industry === 'Hollywood' ? 250 : 200);
  }
  console.log('Catalog and shows are up to date');
}
module.exports = { seed, addShows };
