module.exports = ElasticsearchPlugin;

var debug = require('debug')('happn-stats:elasticsearch');
var request = require('request');

function ElasticsearchPlugin(happnStatsServer) {
  this.happnStatsServer = happnStatsServer;
  this.elasticUrl = process.env.ELASTIC_URL || 'http://localhost:9200';
  this.elasticIndex = process.env.ELASTIC_INDEX || 'happn-stats';
  this.elasticType = process.env.ELASTIC_TYPE || 'happn-stats';
}

ElasticsearchPlugin.prototype.start = function () {
  debug('starting');
  var _this = this;
  return this._ensureIndex()
    .then(function () {
      return _this._ensureType();
    })
    .then(function () {
      return _this._processStats();
    })
}

ElasticsearchPlugin.prototype.stop = function () {
  return new Promise(function (resolve, reject) {
    debug('stopping');
    resolve();
  });
}

ElasticsearchPlugin.prototype._processStats = function () {
  var _this = this;
  return new Promise(function (resolve, reject) {
    _this.happnStatsServer.on('report', _this._onReport.bind(_this));
    resolve();
  });
}

ElasticsearchPlugin.prototype._onReport = function (ts, metrics) {
  var timestamp = new Date(ts);
  var type;
  var value;

  for (var name in metrics.counters) {
    type = 'counter';
    value = metrics.counters[name];
    this._storeMetric(timestamp, type, name, value);
  }

  for (var name in metrics.gauges) {
    type = 'gauge';
    value = metrics.gauges[name];
    this._storeMetric(timestamp, type, name, value);
  }
}

ElasticsearchPlugin.prototype._storeMetric = function (timestamp, type, name, value) {
  var _this = this;
  var url = this.elasticUrl + '/' + this.elasticIndex + '/' + this.elasticType;
  var record = {
    timestamp: timestamp,
    name: name,
    value: value,
    type: type
  };

  record[name] = value;

  request({
    url: url,
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(record)
  }, function (err, res) {
    if (err) {
      if (_this.erroring) return;
      _this.erroring = true;
      debug('failed to save metric', err);
      return;
    }
    if (res.statusCode !== 201) {
      if (_this.erroring) return;
      _this.erroring = true;
      debug('insert metric failed:' + res.statusCode +
        ' ' + res.statusMessage);
      return;
    }
    if (_this.erroring) {
      debug('recovered from error');
      _this.erroring = false;
    }
  });
}

ElasticsearchPlugin.prototype._ensureIndex = function () {
  var indexUrl = this.elasticUrl + '/' + this.elasticIndex;

  return new Promise(function (resolve, reject) {
    debug('ensure index %s', indexUrl);

    request({ url: indexUrl, method: 'HEAD' }, function (err, res) {
      if (err) return reject(err);
      if (res.statusCode === 200) return resolve();

      debug('creating index %s', indexUrl);
      request({
        url: indexUrl,
        method: 'PUT',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          settings: {}
        })
      }, function (err, res) {
        if (err) return reject(err);
        if (res.statusCode === 200) return resolve();

        debug('failed to create index: %d %s', res.statusCode, res.statusMessage);
        reject(new Error('Failed to create Index: ' + res.statusCode + ' ' + res.statusMessage));
      });
    });
  });
}

ElasticsearchPlugin.prototype._ensureType = function () {
  var typeUrl = this.elasticUrl + '/' + this.elasticIndex + '/_mapping/' + this.elasticType;

  return new Promise(function (resolve, reject) {
    debug('ensure type %s', typeUrl);

    request({ url: typeUrl, method: 'HEAD' }, function (err, res) {
      if (err) return reject(err);
      if (res.statusCode === 200) return resolve();

      debug('creating type %s', typeUrl);
      request({
        url: typeUrl,
        method: 'PUT',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            name: {
              type: 'text'
            },
            value: {
              type: 'double'
            },
            timestamp: {
              type: 'date'
            },
            type: {
              type: 'keyword'
            }
          }
        })
      }, function (err, res) {
        if (err) return reject(err);
        if (res.statusCode === 200) return resolve();

        debug('failed to create type: %d %s', res.statusCode, res.statusMessage);
        reject(new Error('Failed to create type: ' + res.statusCode + ' ' + res.statusMessage));
      });
    });
  });
}
