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

const getPageTotal = async (metroAreaId) => {
  const params = getCalendarParams();
  const url = `${BASE_URL}/metro_areas/${metroAreaId}/calendar.json?${params}`;
  const resultsPage = await invokeAPI(url);
  return parseInt(resultsPage.totalEntries / resultsPage.perPage, 10);
};

const getCalendarPage = async (metroAreaId, page) => {
  const params = getCalendarParams({ page });
  const url = `${BASE_URL}/metro_areas/${metroAreaId}/calendar.json?${params}`;
  return invokeAPI(url);
};

const getSongkickCalendar = async (metroAreaId, pageTotal) => {
  let calendar = [];
  const promises = [];
  for (let i = 1; i < pageTotal + 1; i += 1) {
    console.log('on page ', i);
    promises.push(getCalendarPage(metroAreaId, i));
  }
  const pages = (await Promise.all(promises)).map((result) => {
    const page = result && result.results && result.results.event;
    return page;
  });

  calendar = calendar.concat.apply([], pages);

  return calendar;
};

const processPerformance = async (performance, event) => {
  const { artist } = performance;
  let [shouldSkip] = await knex('artist').where('artistId', artist && artist.id);
  if (shouldSkip) {
    return;
  }
  await knex('artist').insert({
    name: artist.displayName,
    songKickUrl: artist.uri,
    artistId: artist.id,
  });

  [shouldSkip] = await knex('performance')
    .where({ eventId: event.id, artistId: artist.id });
  if (shouldSkip) {
    return;
  }
  await knex('performance').insert({
    artistId: artist.id,
    eventId: event.id,
  });
};

const processEvent = async (event) => {
  const [shouldSkip] = await knex('event').where('eventId', event.id);
  if (shouldSkip) {
    return;
  }
  const headliners = event.performance.filter(e => e.billing === 'headline');
  const promises = [];
  headliners.map(performance => promises.push(processPerformance(performance, event)));

  await Promise.all(promises);

  await knex('event').insert({
    eventId: event.id,
    name: event.displayName,
    type: event.type,
    popularity: event.popularity,
    songKickUrl: event.uri,
    date: event.start && new Date(event.start.datetime),
    venueName: event.venue && event.venue.displayName,
    venueId: event.venue && event.venue.id,
  });
};

const processCalendar = async (calendar) => {
  const promises = [];
  calendar.map((event) => {
    promises.push(processEvent(event));
    return null;
  });

  await Promise.all(promises);
};

const findAllConcerts = async (metroAreaId) => {
  const pageTotal = await getPageTotal(metroAreaId);
  console.log('page total', pageTotal);
  const calendar = await getSongkickCalendar(metroAreaId, pageTotal);
  processCalendar(calendar);
};

module.exports = {
  locationSearch,
  findAllConcerts,
};
