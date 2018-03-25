exports.up = knex => knex.schema.table('event', (t) => {
  t.string('metroAreaId');
});

exports.down = knex => knex.schema.table('event', (t) => {
  t.dropColumn('metroAreaId');
});
