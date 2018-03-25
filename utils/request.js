const request = require('request');

function requestLib(options) {
  return new Promise((resolve, reject) => {
    request(options, (err, res, body) => {
      if (!err || (res && res.statusCode === 200)) resolve([res, body]);
      else reject(err);
    });
  });
}

module.exports = {
  requestLib,
};
