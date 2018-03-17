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
  console.log('Body in getTopTracks: ', body);
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
  //console.log(body);
  return body.artists.items[0];
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
    console.log('Tracks added: ', Math.min(100, n - start));
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
    console.log('Body inside addSongURIsToPlaylist: ', body);
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
  console.log('Body in deleteSongsFromPlaylist: ', body);
}

async function safeSearchArtist(artist, accessToken) {
  try {
    return await searchArtist(artist, accessToken);
  } catch (err) {
    console.log('searchArtist Error:  Maybe check access Token.');
    return undefined;
  }
}

async function safeGetTopTracks(accessToken, artistId, numTop) {
  try {
    const topURIs = await getTopTracks(accessToken, artistId, numTop);
    return topURIs;
  } catch (err) {
    console.log('getTopTracks Error: ', err);
    return undefined;
  }
}

async function safeAddSongURIsToPlaylist(accessToken, userId, playlistId, trackURIs) {
  try {
    return await addSongURIsToPlaylist(accessToken, userId, playlistId, trackURIs);
  } catch (err) {
    console.log('addSongURIsToPlaylist Error: ', err);
    return undefined;
  }
}

async function addLocalPlaylist(artistIds, userId, playlistId, accessToken) {
  let tracks = [];
  for (const artistId of artistIds) {
    tracks.push(safeGetTopTracks(accessToken, artistId, 3));
  }
  return Promise.all(tracks).then((ts) => {
    const sortedTracks = ts.sort((a, b) => b[1] - a[1]);
    const trackURIs = sortedTracks.map(track => track[0]);
    safeAddSongURIsToPlaylist(accessToken, userId, playlistId, trackURIs);
  });
}


async function overlapGenre(genres, artist, accessToken) {
  const artistObj = await safeSearchArtist(artist, accessToken);
  let retval = undefined;
  if (artistObj !== undefined) {
    const artistGenres = artistObj.genres;
    const genreOverlap = artistGenres.filter(genre => genres.indexOf(genre) > -1);
    if (genreOverlap.length !== 0) {
      retval = artistObj.id;
    }
  }
  return retval;
}

async function safeOverlapGenre(genres, artist, accessToken) {
  try {
    return await overlapGenre(genres, artist, accessToken);
  } catch (err) {
    console.log('overlapGenre Error: ', err);
    return false;
  }
}

async function filterArtistsByGenre(genres, artists, accessToken) {
  let artistTuples = [];
  for (const artist in artists) {
    artistTuples.push(safeOverlapGenre(genres, artist, accessToken));
  }
  return await Promise.all(artistTuples).then( function (values) {
    let filteredArtists = [];
    for (let i = 0; i < artists.length; i++) {
      if (values[i] !== undefined) {
        filteredArtists.push(values[i]);
      }
    }
    return filteredArtists;
  })
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
  overlapGenre,
  filterArtistsByGenre,
  CLIENT_ID,
  CLIENT_ID_SECRET,
  REDIRECT_URI,
};
