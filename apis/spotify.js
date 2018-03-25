const querystring = require('querystring');
const moment = require('moment');
const throat = require('throat');

const request = require('../utils/request').requestLib;
const knex = require('knex')(require('../knexfile'));

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_ID_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/spotify/callback';
const BASE_URL = 'https://api.spotify.com/v1';

const authenticate = async code => request({
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

const checkProfile = async (accessToken) => {
  const [, body] = await request({
    url: `${BASE_URL}/me`,
    headers: { Authorization: `Bearer ${accessToken}` },
    json: true,
  });
  return body;
};

const topTracks = async (artistId, accessToken, numTop) => {
  const [, body] = await request({
    method: 'GET',
    url: `${BASE_URL}/artists/${artistId}/top-tracks?country=US`,
    headers: { Authorization: `Bearer ${accessToken}` },
    json: true,
  });
  if (body.tracks) {
    return body.tracks
      .slice(0, numTop)
      .map(track => ({ uri: track.uri, popularity: track.popularity }));
  }
  return undefined;
};

const searchArtist = async (query, accessToken) => {
  const [, body] = await request({
    method: 'GET',
    url: `${BASE_URL}/search?${querystring.stringify({
      q: query,
      type: 'artist',
    })}`,
    headers: { Authorization: `Bearer ${accessToken}` },
    json: true,
  });
  return body && body.artists && body.artists.items[0] && body.artists.items[0].id;
};

const createPlaylist = async (userId, accessToken) => {
  const startDate = moment()
    .startOf('week')
    .add('2', 'weeks')
    .format('MM/DD/YYYY');
  const endDate = moment()
    .startOf('week')
    .add('2', 'weeks')
    .endOf('week')
    .format('MM/DD/YYYY');
  const [, body] = await request({
    method: 'POST',
    url: `${BASE_URL}/users/${userId}/playlists`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    form: JSON.stringify({
      name: `${startDate} Local Music`,
      public: false,
      collaborative: false,
      description: `This is a playlist for local music coming near you from ${startDate} to ${endDate}`,
    }),
    json: true,
  });
  return body.id;
};

const addTracksToPlaylist = async (tracks, playlistId, userId, accessToken) => {
  const [, body] = await request({
    method: 'POST',
    url: `${BASE_URL}/users/${userId}/playlists/${playlistId}/tracks`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    json: true,
    form: JSON.stringify({ uris: tracks }),
  });

  return body;
};

// async function addSongURIsToPlaylist(accessToken, userId, playlistId, trackURIs) {
//   const n = trackURIs.length;
//   let start = 0;
//   let end = Math.min(100, n);
//   while (start < n) {
//     // eslint-disable-next-line
//     const [, body] = await request({
//       method: 'POST',
//       url: `${BASE_URL}/users/${userId}/playlists/${playlistId}/tracks`,
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         'Content-Type': 'application/json',
//       },
//       json: true,
//       form: JSON.stringify({ uris: trackURIs.slice(start, end) }),
//     });
//     console.log(body);
//     start = end;
//     end = Math.min(end + 100, n);
//   }
// }

// async function deleteSongsFromPlaylist(accessToken, userId, playlistId) {
//   const [, body] = await request({
//     method: 'PUT',
//     url: `${BASE_URL}/users/${userId}/playlists/${playlistId}/tracks`,
//     headers: {
//       Authorization: `Bearer ${accessToken}`,
//       'Content-Type': 'application/json',
//     },
//     json: true,
//     form: JSON.stringify({ uris: [] }),
//   });
//   console.log(body);
// }

// async function safeSearchArtist(artist, accessToken) {
//   try {
//     return await searchArtist(artist, accessToken);
//   } catch (err) {
//     return undefined;
//   }
// }

// async function safeGetTopTracks(accessToken, artistId, numTop) {
//   try {
//     const topURIs = await getTopTracks(accessToken, artistId, numTop);
//     return topURIs;
//   } catch (err) {
//     console.log(err);
//     return undefined;
//   }
// }

// function safeAddSongURIsToPlaylist(accessToken, userId, playlistId, trackURIs) {
//   try {
//     addSongURIsToPlaylist(accessToken, userId, playlistId, trackURIs);
//   } catch (err) {
//     console.log(err);
//   }
// }

// async function addLocalPlaylist(artists, userId, playlistId, accessToken) {
//   let tracks = [];
//   for (const artist of artists) {
//     const artistId = await safeSearchArtist(artist, accessToken);
//     console.log('Artist ID:', artistId);
//     if (artistId !== undefined) {
//       tracks = tracks.concat(await safeGetTopTracks(accessToken, artistId, 3));
//     }
//   }
//   const sortedTracks = tracks.sort((a, b) => b[1] - a[1]);
//   const trackURIs = sortedTracks.map(track => track[0]);
//   safeAddSongURIsToPlaylist(accessToken, userId, playlistId, trackURIs);
// }

const getArtists = async (events) => {
  const promises = [];
  events.map((e) => {
    const promise = knex('performance')
      .where('eventId', e.eventId)
      .leftJoin('artist', 'performance.artistId', 'artist.artistId');
    promises.push(promise);
    return null;
  });

  return (await Promise.all(promises))
    .map(artist => artist[0] && artist[0].name)
    .filter(artist => artist !== undefined);
};

const searchArtists = async (artists, accessToken) =>
  (await Promise.all(artists.map(throat(8, artist => searchArtist(artist, accessToken)))))
    .filter(artist => artist !== undefined);

const getTopTracks = async (artists, accessToken) => {
  const trackLists = (await Promise.all(artists
    .map(throat(8, artist => topTracks(artist, accessToken, 3)))))
    .filter(track => track !== undefined);
  return [].concat(...trackLists);
};

const insertTracksIntoPlaylist = async (tracks, playlistId, spotifyId, accessToken) => {
  const songs = tracks.sort((a, b) => a.popularity - b.popularity).reverse();
  const n = songs.length;
  let start = 0;
  let end = Math.min(100, n);
  while (start < n) {
    const trackURIs = tracks.slice(start, end).map(t => t.uri);
    addTracksToPlaylist(trackURIs, playlistId, spotifyId, accessToken);
    start = end;
    end = Math.min(end + 100, n);
  }
};

const addSongsToPlaylist = async (playlistId, events, spotifyId, accessToken) => {
  // For all the events, get the artists
  // Do spotify look up of artists
  // If artists are in right genre, get top 1-3 trackURIs
  // Insert tracks to playlist
  console.log('get artist');
  const artists = await getArtists(events);
  console.log('done', artists);
  const tempArtists = artists.slice(0, 10);
  const spotifyArtists = await searchArtists(tempArtists, accessToken);
  console.log('spotifys', spotifyArtists);
  const tracks = await getTopTracks(spotifyArtists, accessToken);
  console.log('tracks', tracks);
  await insertTracksIntoPlaylist(tracks, playlistId, spotifyId, accessToken);
  console.log('inserted all');
};

const buildPlaylist = async (spotifyId, metroAreaId, accessToken) => {
  const playlistId = await createPlaylist(spotifyId, accessToken);
  // const playlistId = 'test';
  const startDate = moment()
    .startOf('week')
    .add('2', 'weeks')
    .format('YYYY-MM-DD');
  const endDate = moment()
    .startOf('week')
    .add('2', 'weeks')
    .endOf('week')
    .format('YYYY-MM-DD');
  const events = await knex('event').whereRaw(
    'metroAreaId = ? and date >= ? and date <= ?',
    [metroAreaId, startDate, endDate],
  );
  await addSongsToPlaylist(playlistId, events, spotifyId, accessToken);
};

const storeUser = async (user, accessToken, refreshToken) => {
  const [existingUser] = await knex('user').where('spotifyId', user.id);
  if (existingUser) {
    await knex('user').where('spotifyId', user.id).update({
      name: user.display_name,
      country: user.country,
      imageUrl: user.images ? user.images[0].url : null,
      accountUrl: user.href,
      accessToken,
      refreshToken,
    });
  } else {
    await knex('user').insert({
      name: user.display_name,
      spotifyId: user.id,
      email: user.email,
      country: user.country,
      imageUrl: user.images ? user.images[0].url : null,
      accountUrl: user.href,
      accessToken,
      refreshToken,
    });
  }
};


module.exports = {
  authenticate,
  checkProfile,
  getTopTracks,
  searchArtist,
  createPlaylist,
  buildPlaylist,
  storeUser,
  CLIENT_ID,
  CLIENT_ID_SECRET,
  REDIRECT_URI,
};
