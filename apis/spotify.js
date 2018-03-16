const express = require('express');
const querystring = require('querystring');
const util = require('util');

const request = require('../utils/request').requestLib;
const helpers = require('../utils/helpers');

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_ID_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/spotify/callback';

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
      Authorization: `Basic ${(Buffer.from(`${CLIENT_ID}:${CLIENT_ID_SECRET}`).toString('base64'))}`,
    },
    json: true,
  });
}

async function checkProfile(accessToken) {
  const [, body] = await request({
    url: 'https://api.spotify.com/v1/me',
    headers: { Authorization: `Bearer ${accessToken}` },
    json: true,
  });
  return body.id;
}

async function getTopTracks(accessToken, artistId, numTop) {
  const [, body] = await request({

    method: 'GET',
    url: `https://api.spotify.com/v1/artists/${artistId}/top-tracks?${querystring.stringify({
      country: 'US',
    })}`,
    headers: { Authorization: `Bearer ${accessToken}` },
    json: true,
  });
  return body.tracks.slice(0, numTop).map(track => [track.uri, track.popularity]);
}

async function searchArtist(query, accessToken) {
  const [, body] = await request({
    method: 'GET',
    url: `https://api.spotify.com/v1/search?${querystring.stringify({
      q: query,
      type: 'artist',
    })}`,
    headers: { Authorization: `Bearer ${accessToken}` },
    json: true,
  });
  return body.artists.items[0].id;
}

async function createPlaylist(userId, accessToken) {
  const [, body] = await request({
    method: 'POST',
    url: `https://api.spotify.com/v1/users/${userId}/playlists`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    form: JSON.stringify({
      name: 'Discover Local Weekly',
      public: false,
      collaborative: false,
      description: 'This is a playlist for local music coming near you in two weeks time.',
    }),
    json: true,
  });
  return body.id;
}

async function addSongURIsToPlaylist(accessToken, userId, playlistId, trackURIs) {
  const n = trackURIs.length;
  let start = 0;
  let end = Math.min(100, n);
  while (start < n) {
    // eslint-disable-next-line
    const [, body] = await request({
      method: 'POST',
      url: `https://api.spotify.com/v1/users/${userId}/playlists/${playlistId}/tracks`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      json: true,
      form: JSON.stringify({ uris: trackURIs.slice(start, end) }),
    });
    console.log(body);
    start = end;
    end = Math.min(end + 100, n);
  }
}

async function deleteSongsFromPlaylist(accessToken, userId, playlistId) {
  const [, body] = await request({
    method: 'PUT',
    url: `https://api.spotify.com/v1/users/${userId}/playlists/${playlistId}/tracks`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    json: true,
    form: JSON.stringify({ uris: [] }),
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
  for (const artist of artists) {
    const artistId = await safeSearchArtist(artist, accessToken);
    console.log('Artist ID:', artistId);
    if (artistId !== undefined) {
      tracks = tracks.concat(await safeGetTopTracks(accessToken, artistId, 3));
    }
  }
  const sortedTracks = tracks.sort((a, b) => b[1] - a[1]);
  const trackURIs = sortedTracks.map(track => track[0]);
  safeAddSongURIsToPlaylist(accessToken, userId, playlistId, trackURIs);
}


module.exports = {
  authenticate,
  checkProfile,
  getTopTracks,
  searchArtist,
  createPlaylist,
  addSongURIsToPlaylist,
  deleteSongsFromPlaylist,
  safeSearchArtist,
  safeGetTopTracks,
  safeAddSongURIsToPlaylist,
  addLocalPlaylist,
  CLIENT_ID,
  CLIENT_ID_SECRET,
  REDIRECT_URI,
};
