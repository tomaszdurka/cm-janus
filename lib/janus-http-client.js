var requestPromise = require('request-promise');
var serviceLocator = require('./service-locator');
var ProxyConnection = require('./proxy-connection');

function JanusHttpClient(url) {
  this.baseUrl = url;
}

JanusHttpClient.prototype._requestPromise = requestPromise;

/**
 * @param {String} action
 * @param {Object} [data]
 * @returns {Promise}
 * @private
 */
JanusHttpClient.prototype._request = function(action, data) {
  action = action || '/';
  var options = {
    method: 'POST',
    uri: this.baseUrl + action,
    json: true
  };
  if (data) {
    options.body = data;
  }

  serviceLocator.get('logger').info('janus-http-client', 'request', options.uri, options.body);
  return this._requestPromise(options)
    .catch(function(error) {
      throw new Error('janus-http-client error: ' + error['message']);
    })
    .then(function(response) {
      serviceLocator.get('logger').info('janus-http-client', 'response', response);
      if ('error' == response['janus']) {
        throw new Error('janus-http-client error: ' + response['error']['reason']);
      }
      if (response['plugindata'] && response['plugindata']['data'] && response['plugindata']['data']['error']) {
        throw new Error('janus-http-client error: ' + response['plugindata']['data']['error']);
      }
      return response;
    });
};

JanusHttpClient.prototype.stopStream = function(sessionId, pluginId) {
  return this._request('/' + sessionId + '/' + pluginId, {
    body: {request: 'stop'},
    janus: 'message',
    transaction: ProxyConnection.generateTransactionId()
  });
};

module.exports = JanusHttpClient;
