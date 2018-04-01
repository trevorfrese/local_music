const knex = require('knex')(require('../knexfile'));
const songkick = require('./songkick');
const spotify = require('./spotify');

const getUserGenres = async (userId) => {
  const genres = await knex('genre')
    .select('genre.name')
    .innerJoin('userGenre', 'genre.id', 'userGenre.genreId')
    .where('userId', userId);
  return genres.map(genre => genre.name);
};

async function retrieveUser(userId) {
  const [user] = await knex('user').where('id', userId);
  console.log('user\n', user, '\n');
  const metroAreaId = await songkick.locationSearch('Los Angeles');
  console.log('metro area id \n', metroAreaId, '\n');
  // await songkick.findAllConcerts(metroAreaId);
  const genres = await getUserGenres(userId);
  await spotify.buildPlaylist(user.spotifyId, metroAreaId, genres, user.accessToken);
}

module.exports = {
  retrieveUser,
};
