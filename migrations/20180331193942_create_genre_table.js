exports.up = knex => knex.schema.createTable('genre', (t) => {
  t.increments('id').primary();
  t.string('name').notNullable();
  t.timestamps(false, true);
});


exports.down = knex => knex.schema.dropTableIfExists('genre');
