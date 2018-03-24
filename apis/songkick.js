const { SONGKICK_API_KEY } = process.env;
const BASE_URL = 'http://api.songkick.com/api/3.0';

const knex = require('knex')(require('../knexfile'));

const querystring = require('querystring');
const request = require('../utils/request').requestLib;
const moment = require('moment');

const invokeAPI = async (url) => {
  const [, body] = await request({
    method: 'GET',
    url,
    json: true,
  });
  return body.resultsPage;
};

const getCalendarParams = (additionalParams = {}) => {
  const min = moment()
    .startOf('week')
    .add('2', 'weeks')
    .format('YYYY-MM-DD');
  const max = moment()
    .startOf('week')
    .add('2', 'weeks')
    .endOf('week')
    .format('YYYY-MM-DD');
  let params = additionalParams;
  params = {
    ...params,
    apikey: SONGKICK_API_KEY,
    min_date: min,
    max_date: max,
  };

  return querystring.stringify(params);
};

const getMetroAreaId = async (query) => {
  const params = querystring.stringify({
    apikey: SONGKICK_API_KEY,
    query,
  });

  const url = `${BASE_URL}/search/locations.json?${params}`;
  const result = await invokeAPI(url);
  const [location] = result && result.results && result.results.location;
  return location && location.metroArea && location.metroArea.id;
};

const locationSearch = async (query) => {
  const [metroArea] = await knex('metroArea').where('location', query);
  if (metroArea) {
    return metroArea.metroAreaId;
  }

  const metroAreaId = await getMetroAreaId(query);
  await knex('metroArea').insert({
    location: query,
    metroAreaId,
  });
  return metroAreaId;
};

async function getPageTotal(metroAreaId) {
  const params = getCalendarParams();
  const url = `${BASE_URL}/metro_areas/${metroAreaId}/calendar.json?${params}`;
  const resultsPage = await invokeAPI(url);
  return parseInt(resultsPage.totalEntries / resultsPage.perPage, 10);
}

async function getCalendarPage(metroAreaId, page) {
  const params = getCalendarParams({ page });
  const url = `${BASE_URL}/metro_areas/${metroAreaId}/calendar.json?${params}`;
  return invokeAPI(url);
}

async function getSongkickCalendar(metroAreaId, pageTotal) {
  let calendar = [];
  // TO MAKE IT RUN FAST SET pageTotal = 1
  pageTotal = 1
  for (let i = 1; i < pageTotal + 1; i += 1) {
    console.log('on page ', i);
    const result = await getCalendarPage(metroAreaId, i);
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

const getLocalArtists = async (metroAreaId) => {
  const pageTotal = await getPageTotal(metroAreaId);
  console.log('page total', pageTotal);
  const calendar = await getSongkickCalendar(metroAreaId, pageTotal);
  const artists = parseArtistsFromCalendar(calendar);
  return artists;
};

// async function getBayAreaArtists() {
//   try {
//     const BAY_AREA_METRO_ID = 26330;
//     const artists = await getLocalArtists(BAY_AREA_METRO_ID);
//     console.log(artists);
//   } catch (err) {
//     console.log(err);
//   }
// }

module.exports = {
  locationSearch,
  getLocalArtists,
};
