var _ = require('lodash');
var fetch = require('node-fetch');
var moment = require('moment');
fetch.Promise = require('bluebird');
//var parseDateMath = require('../utils/date_math.js');


var Datasource = require('../lib/classes/datasource');


module.exports = new Datasource ('quandl', {
  dataSource: true,
  args: [
    {
      name: 'code',
      types: ['string', 'null'],
      help: 'The quandl code to plot. You can find these on quandl.com.'
    },
    {
      name: 'position',
      types: ['number', 'null'],
      help: 'Some quandl sources return multiple series, which one should I use? 1 based index.'
    }
  ],
  help: 'Pull data from quandl.com using the quandl code. Stick your free API key in timelion.json. API is rate limited without a key',
  fn: function quandlFn(args, tlConfig) {
    var intervalMap = {
      '1d': 'daily',
      '1w': 'weekly',
      '1M': 'monthly',
      '1y': 'annual',
    };

    var config = _.defaults(args.byName, {
      code: 'WIKI/AAPL',
      position: 1,
      interval: intervalMap[tlConfig.time.interval] || 'daily',
      apikey: tlConfig.file.quandl.key
    });

    if (!config.interval) {
      throw 'quandl() unsupported interval: ' + tlConfig.time.interval + '. quandl() supports: ' + _.keys(intervalMap).join(', ');
    }

    var time = {
      min: moment(tlConfig.time.from).format('YYYY-MM-DD'),
      max:  moment(tlConfig.time.to).format('YYYY-MM-DD')
    };

    // POSITIONS
    // 1. open
    // 2. high
    // 3. low
    // 4. close
    // 5. volume

    var URL = 'https://www.quandl.com/api/v1/datasets/' + config.code + '.json' +
      '?sort_order=asc' +
      '&trim_start=' + time.min +
      '&trim_end=' + time.max +
      '&collapse=' + config.interval +
      '&auth_token=' + config.apikey;

    return fetch(URL).then(function (resp) { return resp.json(); }).then(function (resp) {
      var data = _.map(resp.data, function (bucket) {
        return [moment(bucket[0]).valueOf(), bucket[config.position]];
      });

      return {
        type: 'seriesList',
        list: [{
          data:  data,
          type: 'series',
          fit: 'nearest',
          label: resp.name
        }]
      };
    }).catch(function (e) {
      throw e;
    });
  }
});
