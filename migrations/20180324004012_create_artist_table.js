exports.up = knex => knex.schema.createTable('artist', (t) => {
  t.increments('id').primary();
  t.string('artistId').notNullable();
  t.string('songKickUrl', 2000);
  t.string('name');
  t.timestamps(false, true);
});

exports.down = knex => knex.schema.dropTableIfExists('artist');
