exports.up = knex => knex.schema.table('user', (t) => {
  t.string('name');
  t.string('country');
  t.string('imageUrl', 2000);
  t.string('accountUrl', 2000);
});

exports.down = knex => knex.schema.table('user', (t) => {
  t.dropColumn('name');
  t.dropColumn('country');
  t.dropColumn('imageUrl');
  t.dropColumn('accountUrl');
});
