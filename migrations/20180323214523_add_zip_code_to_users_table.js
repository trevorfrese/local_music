exports.up = knex => knex.schema.table('user', (t) => {
  t.string('zipCode');
});

exports.down = knex => knex.schema.table('user', (t) => {
  t.dropColumn('zipCode');
});
