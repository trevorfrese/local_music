exports.up = knex => knex.schema.createTable('performance', (t) => {
  t.increments('id').primary();
  t.string('eventId').notNullable();
  t.string('artistId').notNullable();
  t.timestamps(false, true);
});

exports.down = knex => knex.schema.dropTableIfExists('performance');
