require('dotenv').config();
const express = require('express');

const app = express();
app.listen(3000, () => console.log('Example app listening on port 3000!'));
app.use(express.static(__dirname + '/public'));

async function start() {
  console.log('we here');

}
app.use('/spotify', require('./routes/spotify'))


start();
