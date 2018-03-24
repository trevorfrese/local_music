const knex = require('knex')(require('../knexfile'));
const songkick = require('./songkick');

async function retrieveUser(userId) {
  const [user] = await knex('user').where('id', userId);
  console.log(user);
  const metroAreaId = await songkick.locationSearch('Los Angeles');
  // const conc
  console.log('got results', metroAreaId);
}

module.exports = {
  retrieveUser,
};
