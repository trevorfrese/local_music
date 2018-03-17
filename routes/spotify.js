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

router.get('/shows', async (req, res) => {
  try {
    // TODO Functionality: Change this when we enable different metro area ids as user input
    // const metroAreaId = req.metroAreaId
    const metroAreaId = 26330;
    const artists = await songkick.getLocalArtists(metroAreaId);

    // TODO DB: Get access token from DB
    const accessToken = 'BQCNJjWlx_29CfjM96TiMPT-JYPbxtU59V8Kr2KO5jbEKcHhg7FK8opWVrpcx2QsKgoD9KMniGZGDlD5INh87Z5SqEwrF9vx00NBW-OJf3viwAX0Sk6OH0MzS6IFX6XbctvjG5I58idWNwhy0nZgcMtS_Ad0wCc3OzLiu4b7RsADFz8PXRamti8jVSv2lRE';
    // TODO DB: Get genres from user's database when integrated
    const genres = ['funk', 'techno', 'hip hop', 'electronic', 'deep house'];
    const filteredArtists = await spotify.filterArtistsByGenre(genres, artists, accessToken);

    // TODO DB: Get userId from DB and playlistId from DB
    const userId = await spotify.checkProfile(accessToken);
    const playlistId = await spotify.createPlaylist(userId, accessToken);
    await spotify.addLocalPlaylist(filteredArtists, userId, playlistId, accessToken);
    console.log('FINISHED PLAYLIST!');
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

(async () => {
  try {
    console.log("BS");

    //const accessToken = 'BQAflBEL87hxLf7aVSYd6wX0vKoZp8YNvN00VB3Vf_OZVVrsZUxJasOwbjozhMBxqfSOJQk6ZH0YHX4BjTvEGiExiDo6GX7I09tClLOFN0CnDQr4bRish02qClXNp7wv1Dm9cc6dgZBDHNcWR8yAjIYTtr27J14CcAxEjgNsj74gZtcjyLpgIKSDumv3koQ';

    // const playlistId = await spotify.createPlaylist(userId, accessToken);
    // const artists = ['Frank ocean', 'Vulfpeck', 'John Mayer'];
    // console.log(playlistId);
    // await spotify.addLocalPlaylist(artists, userId, playlistId, accessToken);
  } catch (err) {
    console.log(err);
  }
})();

module.exports = router;
