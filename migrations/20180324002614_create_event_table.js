exports.up = knex => knex.schema.createTable('event', (t) => {
  t.increments('id').primary();
  t.string('eventId').notNullable();
  t.string('name', 2000);
  t.string('type');
  t.float('popularity');
  t.string('songKickUrl', 2000);
  t.dateTime('date');
  t.string('venueName');
  t.string('venueId');
  t.timestamps(false, true);
});


exports.down = knex => knex.schema.dropTableIfExists('event');
