const express = require('express');
const querystring = require('querystring');
const util = require('util');
const request = require('../utils/request.js').requestLib;

const router = express.Router();
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_ID_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/spotify/callback';
const SONGKICK_API_KEY = process.env.SONGKICK_API_KEY;

function generateRandomString(length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

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
  return request({
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
  const [, body] = await request({
    url: 'https://api.spotify.com/v1/me',
    headers: { 'Authorization': 'Bearer ' + accessToken },
    json: true
  });
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

async function getCalendarPage(metroAreaId, pageNumber) {
  const [, body] = await request({
   method: 'GET',
   url: `http://api.songkick.com/api/3.0/metro_areas/${metroAreaId}/calendar.json?${querystring.stringify({
     apikey: SONGKICK_API_KEY,
     page: pageNumber
   })}`,
   json: true
 });
 return body;
}

async function getSongkickCalendar(metroAreaId, pageTotal) {
  let calendar = [];
  // TO MAKE IT RUN FAST SET pageTotal = 1
  for (let i = 1; i < pageTotal + 1; i += 1) {
    console.log('on page ', i);
    const result = (await getCalendarPage(metroAreaId, i)).resultsPage;
    const page =  result && result.results && result.results.event;
    calendar = calendar.concat(page);
  }

  return calendar;
}

function parseArtistsFromCalendar(calendar) {
  const artists = [];
  for (const event of calendar) {
    event.performance = event.performance.filter((e) => { return e.billing === 'headline'});
    for (const performance of event.performance) {
      artists.push(performance.displayName);
    }
  }
  return artists;
}

async function getPageTotal(metroAreaId) {
  const [, body] = await request({
   method: 'GET',
   url: `http://api.songkick.com/api/3.0/metro_areas/${metroAreaId}/calendar.json?${querystring.stringify({
     apikey: SONGKICK_API_KEY
   })}`,
   json: true
 });

 return parseInt(body.resultsPage.totalEntries / body.resultsPage.perPage, 10);
}

async function getLocalArtists(metroAreaId) {
  const pageTotal = await getPageTotal(metroAreaId);
  console.log('page total', pageTotal);
  const calendar = await getSongkickCalendar(metroAreaId, pageTotal);
  const artists = parseArtistsFromCalendar(calendar);
  return artists;
}

async function getBayAreaArtists() {
  try {
    const BAY_AREA_METRO_ID = 26330;
    const artists = await getLocalArtists(BAY_AREA_METRO_ID);
    console.log(artists);
  } catch (err) {
    console.log(err);
  }
}
(async() => {
  try {
    getBayAreaArtists();
  } catch (err) {
    console.log(err);
  }
})()

module.exports = router;
