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
    const scope = 'user-read-private user-read-email playlist-modify-private';
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
  return body.id;
}

async function getTopTracks(accessToken, artistId, numTop) {
  const [, body] = await requestLib({

    method: 'GET',
    url: `https://api.spotify.com/v1/artists/${artistId}/top-tracks?${querystring.stringify({
      country: 'US'
    })}`,
    headers: { 'Authorization': 'Bearer ' + accessToken },
    json: true
  });
  return body.tracks.slice(0,numTop).map(track => [track.uri, track.popularity])
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
  return body.artists.items[0].id;
}

async function createPlaylist(userId, accessToken) {
  const[, body] = await requestLib({
    method: 'POST',
    url: `https://api.spotify.com/v1/users/${userId}/playlists`,
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    },
    form: JSON.stringify({
      name: "Discover Local Weekly",
      public: false,
      collaborative: false,
      description: "This is a playlist for local music coming near you in two weeks time."
    }),
    json: true
  });
  return body.id;
}

async function addSongURIsToPlaylist(accessToken, userId, playlistId, trackURIs) {
  const n = trackURIs.length;
  let start = 0;
  let end = Math.min(100, n);
  while ( start < n ) {
    const [, body] = await requestLib({
      method: 'POST',
      url: `https://api.spotify.com/v1/users/${userId}/playlists/${playlistId}/tracks`,
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      json: true,
      form: JSON.stringify({uris: trackURIs.slice(start, end)}),
    });
    console.log(body);
    start = end;
    end = Math.min(end + 100, n);
  }
}

async function deleteSongsFromPlaylist(accessToken, userId, playlistId) {
  const [, body] = await requestLib({
    method: 'PUT',
    url: `https://api.spotify.com/v1/users/${userId}/playlists/${playlistId}/tracks`,
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    },
    json: true,
    form: JSON.stringify({uris: []}),
  });
  console.log(body);
}

async function safeSearchArtist(artist, accessToken) {
  try {
    return await searchArtist(artist, accessToken);
  } catch (err) {
    return undefined;
  }
}

async function safeGetTopTracks(accessToken, artistId, numTop) {
  try {
    const topURIs = await getTopTracks(accessToken, artistId, numTop);
    return topURIs;
  } catch (err) {
    console.log(err);
    return undefined;
  }
}

function safeAddSongURIsToPlaylist(accessToken, userId, playlistId, trackURIs) {
  try {
    addSongURIsToPlaylist(accessToken, userId, playlistId, trackURIs);
  } catch (err) {
      console.log(err);
  }
}

async function addLocalPlaylist(artists, userId, playlistId, accessToken) {
  let tracks = [];
  for (let artist of artists) {
    const artistId = await safeSearchArtist(artist, accessToken);
    console.log("Artist ID:", artistId);
    if (artistId != undefined) {
      tracks = tracks.concat(await safeGetTopTracks(accessToken, artistId, 3));
    }
  }
  const sortedTracks = tracks.sort(function (a,b) {return b[1] - a[1]});
  const trackURIs = sortedTracks.map(track => track[0])
  safeAddSongURIsToPlaylist(accessToken, userId, playlistId, trackURIs);
}

router.get('/callback', async (req, res) => {
  try {
    const code = req.query.code || null;

    const [, body] = await authenticate(code);

    const accessToken = body.access_token;
    const refreshToken = body.refresh_token;

    console.log('got token', accessToken, refreshToken);
    console.log('BODY: ', body);

    await checkProfile(accessToken);
    await searchArtist('Frank ocean', accessToken);
    await getTopTracks(accessToken, '2h93pZq0e7k5yf4dywlkpM');

    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

(async() => {
  try {
    const accessToken = "BQAnYHaAHzRXFVKdStcnzzUmig5LHxRwPCAvSqzjmfsFpszoTByCyUOCXaZDQYSLyR7VT9N_dT6YWOqZk7uyoYC6nP818J8KSFicjZyJuxe87y_urQjeCSbTz3awc6S8DNWvoEIV0iogNFYz7eBk4-39Cg2MXH0TJzgjLxS62ap0fxdekB6OVYwOHzAOJhw"
    const userId = await checkProfile(accessToken);
    const playlistId = await createPlaylist(userId, accessToken);
    var artists = ["Frank ocean", "Wolfpeck", "John Mayer"];
    console.log(playlistId);
    await addLocalPlaylist(artists, userId, playlistId, accessToken);
  } catch (err) {
    console.log(err);
  }
})()

module.exports = router;
