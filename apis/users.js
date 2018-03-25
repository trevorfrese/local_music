const knex = require('knex')(require('../knexfile'));
const songkick = require('./songkick');
const spotify = require('./spotify');

async function retrieveUser(userId) {
  const [user] = await knex('user').where('id', userId);
  console.log('user\n', user, '\n');
  const metroAreaId = await songkick.locationSearch('Los Angeles');
  console.log('metro area id \n', metroAreaId, '\n');
  // await songkick.findAllConcerts(metroAreaId);
  await spotify.buildPlaylist(user.spotifyId, metroAreaId, user.accessToken);
}

module.exports = {
  retrieveUser,
};
