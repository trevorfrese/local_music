const SONGKICK_API_KEY = process.env.SONGKICK_API_KEY;
const BASE_URL = 'http://api.songkick.com/api/3.0';

const knex = require('knex')(require('../knexfile'));

const querystring = require('querystring');
const request = require('../utils/request').requestLib;

const invokeAPI = async (url) => {
  const [, body] = await request({
    method: 'GET',
    url,
    json: true,
  });
  return body.resultsPage;
};

const locationSearch = async (query) => {
  const [metroArea] = await knex('metroArea').where('location', query);
  if (metroArea) {
    return metroArea.metroAreaId;
  }
  const params = querystring.stringify({
    apikey: SONGKICK_API_KEY,
    query,
  });

  const url = `${BASE_URL}/search/locations.json?${params}`;
  const result = await invokeAPI(url);
  const [location] = result && result.results && result.results.location;
  const metroAreaId = location && location.metroArea && location.metroArea.id;
  await knex('metroArea').insert({
    location: query,
    metroAreaId,
  });
  return metroAreaId;
};

async function getCalendarPage(metroAreaId, pageNumber) {
  const [, body] = await request({
    method: 'GET',
    url: `http://api.songkick.com/api/3.0/metro_areas/${metroAreaId}/calendar.json?${querystring.stringify({
      apikey: SONGKICK_API_KEY,
      page: pageNumber,
    })}`,
    json: true,
  });
  return body;
}

async function getSongkickCalendar(metroAreaId, pageTotal) {
  let calendar = [];
  // TO MAKE IT RUN FAST SET pageTotal = 1
  for (let i = 1; i < pageTotal + 1; i += 1) {
    console.log('on page ', i);
    const result = (await getCalendarPage(metroAreaId, i)).resultsPage;
    const page = result && result.results && result.results.event;
    calendar = calendar.concat(page);
  }

  return calendar;
}

function parseArtistsFromCalendar(calendar) {
  const artists = [];
  for (const event of calendar) {
    event.performance = event.performance.filter(e => e.billing === 'headline');
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
      apikey: SONGKICK_API_KEY,
    })}`,
    json: true,
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

module.exports = {
  locationSearch,
};
