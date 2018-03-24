exports.up = knex => knex.schema.table('user', (t) => {
  t.string('refreshToken');
});

exports.down = knex => knex.schema.table('user', (t) => {
  t.dropColumn('refreshToken');
});
