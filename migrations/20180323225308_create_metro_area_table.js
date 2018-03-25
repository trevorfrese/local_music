exports.up = knex => knex.schema.createTable('metroArea', (t) => {
  t.increments('id').primary();
  t.string('location').notNullable();
  t.string('metroAreaId').notNullable();
  t.timestamps(false, true);
});


exports.down = knex => knex.schema.dropTableIfExists('metroArea');
