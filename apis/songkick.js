const querystring = require('querystring');

const API_KEY = process.env.SONGKICK_API_KEY;
const request = require('../utils/request').requestLib;

async function getCalendarPage(metroAreaId, pageNumber) {
  const [, body] = await request({
    method: 'GET',
    url: `http://api.songkick.com/api/3.0/metro_areas/${metroAreaId}/calendar.json?${querystring.stringify({
      apikey: API_KEY,
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
    const result = (await getCalendarPage(metroAreaId, i)).resultsPage;
    const page = result && result.results && result.results.event;
    calendar = calendar.concat(page);
  }

  return calendar;
  /*
  let calendar = [];
  let pages = [];
  for (let i = 1; i < pageTotal + 1; i++) {
    pages.push(getCalendarPage(metroAreaId, i));
  }
  const val = await Promise.all(pages).then(ret => function(ret) {
    const res = ret.resultsPage;
    return [res && res.results && res.results.event];
  });
  */
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
      apikey: API_KEY,
    })}`,
    json: true,
  });

  return parseInt(body.resultsPage.totalEntries / body.resultsPage.perPage, 10);
}

async function getLocalArtists(metroAreaId) {
  let pageTotal = await getPageTotal(metroAreaId);
  pageTotal = 3;
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
  getCalendarPage,
  getSongkickCalendar,
  parseArtistsFromCalendar,
  getPageTotal,
  getLocalArtists,
  getBayAreaArtists,
  API_KEY,
};
