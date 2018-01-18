const express = require('express');
const querystring = require('querystring');
const request = require('request');
const util = require('util')

const router = express.Router();

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_ID_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/spotify/callback';

function generateRandomString(length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

function requestLib(options) {
  return new Promise((resolve, reject) => {
    request(options, (err, res, body) => {
      if (!err || res.statusCode === 200) resolve([res, body]);
      else reject(err);
    })
  });
}


router.get('/register', async (req, res) => {
  try {
    const state = generateRandomString(16);

    console.log('register');
    const scope = 'user-read-private user-read-email';
    res.redirect('https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: process.env.SPOTIFY_CLIENT_ID,
        scope: scope,
        redirect_uri: REDIRECT_URI,
        state: state
      }));
  } catch (err) {
    console.log(err);
  }
});

async function authenticate(code) {
  return requestLib({
    method: 'POST',
    url: 'https://accounts.spotify.com/api/token',
    form: {
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI
    },
    headers: {
      'Authorization': 'Basic ' + (new Buffer(CLIENT_ID + ':' + CLIENT_ID_SECRET).toString('base64'))
    },
    json: true
  });
}

async function checkProfile(accessToken) {
  const [, body] = await requestLib({
    url: 'https://api.spotify.com/v1/me',
    headers: { 'Authorization': 'Bearer ' + accessToken },
    json: true
  });
}

async function getTopTracks(accessToken, artistId) {
  const [, body] = await requestLib({
    method: 'GET',
    url: `https://api.spotify.com/v1/artists/${artistId}/top-tracks?${querystring.stringify({
      country: 'US'
    })}`,
    headers: { 'Authorization': 'Bearer ' + accessToken },
    json: true
  });
  // TODO sort by popularity for tracks to get top tracks. 100 being most popular
  console.log(util.inspect(body, false, null));
}

async function searchArtist(query, accessToken) {
  const [, body] = await requestLib({
    method: 'GET',
    url: `https://api.spotify.com/v1/search?${querystring.stringify({
      q: query,
      type: 'artist'
    })}`,
    headers: { 'Authorization': 'Bearer ' + accessToken },
    json: true
  });
  console.log(util.inspect(body, false, null));
}


router.get('/callback', async (req, res) => {
  try {
    var code = req.query.code || null;
    var state = req.query.state || null;

    const [, body] = await authenticate(code);

    const accessToken = body.access_token;
    const refreshToken = body.refresh_token;

    console.log('got token', accessToken, refreshToken);

    await checkProfile(accessToken);
    await searchArtist('Frank ocean', accessToken);
    await getTopTracks(accessToken, '2h93pZq0e7k5yf4dywlkpM');

    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});


module.exports = router;
