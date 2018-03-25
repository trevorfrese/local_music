const express = require('express');
const querystring = require('querystring');

const helpers = require('../utils/helpers');
const spotify = require('../apis/spotify');

const router = express.Router();


router.get('/register', async (req, res) => {
  try {
    const state = helpers.generateRandomString(16);

    console.log('register');
    const scope = 'user-read-private user-read-email playlist-modify-private';
    res.redirect(`https://accounts.spotify.com/authorize?${querystring.stringify({
      response_type: 'code',
      client_id: spotify.CLIENT_ID,
      scope,
      redirect_uri: spotify.REDIRECT_URI,
      state,
    })}`);
  } catch (err) {
    console.log(err);
  }
});

router.get('/callback', async (req, res) => {
  try {
    const code = req.query.code || null;

    const [, body] = await spotify.authenticate(code);

    const accessToken = body.access_token;
    const refreshToken = body.refresh_token;

    // console.log('got token', accessToken, refreshToken);
    // console.log('BODY: ', body);

    const user = await spotify.checkProfile(accessToken);
    await spotify.storeUser(user, accessToken, refreshToken);

    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(500);
  }
});

module.exports = router;
