exports.up = knex => knex.schema.createTable('userGenre', (t) => {
  t.increments('id').primary();
  t.string('userId').notNullable();
  t.string('genreId').notNullable();
  t.timestamps(false, true);
});

exports.down = knex => knex.schema.dropTableIfExists('userGenre');
