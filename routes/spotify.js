const express = require('express');
const querystring = require('querystring');
const util = require('util');

const request = require('../utils/request').requestLib;
const songkick = require('../apis/songkick');


const router = express.Router();
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_ID_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/spotify/callback';


function generateRandomString(length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

router.get('/register', async (req, res) => {
  try {
    const state = generateRandomString(16);

    console.log('register');
    const scope = 'user-read-private user-read-email';
    res.redirect(`https://accounts.spotify.com/authorize?${querystring.stringify({
      response_type: 'code',
      client_id: process.env.SPOTIFY_CLIENT_ID,
      scope,
      redirect_uri: REDIRECT_URI,
      state,
    })}`);
  } catch (err) {
    console.log(err);
  }
});

async function authenticate(code) {
  return request({
    method: 'POST',
    url: 'https://accounts.spotify.com/api/token',
    form: {
      code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
    },
    headers: {
      'Authorization': 'Basic ' + (new Buffer(CLIENT_ID + ':' + CLIENT_ID_SECRET).toString('base64'))
    },
    json: true,
  });
}

async function checkProfile(accessToken) {
  const [, body] = await request({
    url: 'https://api.spotify.com/v1/me',
    headers: { 'Authorization': 'Bearer ' + accessToken },
    json: true,
  });

  return  body;
}

async function getTopTracks(accessToken, artistId) {
  const [, body] = await request({
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
  const [, body] = await request({
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
    const code = req.query.code || null;

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
