
exports.up = (knex) => {
  return knex.schema.createTable('user', (t) => {
    t.increments('id').primary();
    t.string('spotifyId').notNullable();
    t.string('email');
    t.timestamps(false, true);
  });
};

exports.down = (knex) => {
  return knex.schema.dropTableIfExists('user');
};
