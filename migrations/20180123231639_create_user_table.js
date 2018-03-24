
exports.up = knex => knex.schema.createTable('user', (t) => {
  t.increments('id').primary();
  t.string('spotifyId').notNullable();
  t.string('email');
  t.timestamps(false, true);
});


exports.down = knex => knex.schema.dropTableIfExists('user');
