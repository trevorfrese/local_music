const express = require('express');
const querystring = require('querystring');
const util = require('util');

const helpers = require('../utils/helpers');

const songkick = require('../apis/songkick');
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

    console.log('got token', accessToken, refreshToken);
    console.log('BODY: ', body);

    await spotify.checkProfile(accessToken);
    await spotify.searchArtist('Frank ocean', accessToken);
    await spotify.getTopTracks(accessToken, '2h93pZq0e7k5yf4dywlkpM');

    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

(async () => {
  try {
    const accessToken = 'BQAflBEL87hxLf7aVSYd6wX0vKoZp8YNvN00VB3Vf_OZVVrsZUxJasOwbjozhMBxqfSOJQk6ZH0YHX4BjTvEGiExiDo6GX7I09tClLOFN0CnDQr4bRish02qClXNp7wv1Dm9cc6dgZBDHNcWR8yAjIYTtr27J14CcAxEjgNsj74gZtcjyLpgIKSDumv3koQ';
    const playlistId = await spotify.createPlaylist(userId, accessToken);
    const artists = ['Frank ocean', 'Vulfpeck', 'John Mayer'];
    console.log(playlistId);
    await spotify.addLocalPlaylist(artists, userId, playlistId, accessToken);
  } catch (err) {
    console.log(err);
  }
})();

module.exports = router;
