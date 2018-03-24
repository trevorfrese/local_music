
exports.up = knex => knex.schema.table('user', (t) => {
  t.string('accessToken', 2000).notNullable();
});


exports.down = knex => knex.schema.table('user', (t) => {
  t.dropColumn('accessToken');
});
