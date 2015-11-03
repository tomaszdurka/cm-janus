var PluginAbstract = require('./abstract.js');
var cmApiClient = require('../cm-api-client');
var Stream = require('../stream');

var util = require('util');
var auth = require('../auth');
var streams = require('../streams');
var logger = require('../logger');

function PluginStreaming(id, type, proxyConnection) {
  PluginStreaming.super_.apply(this, arguments);
  this.stream = null;
}

util.inherits(PluginStreaming, PluginAbstract);

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginStreaming.prototype.processMessage = function(message) {
  if ('message' === message.janus && 'create' === message.body.request) {
    return this.onCreate(message);
  }
  if ('message' === message.janus && 'watch' === message.body.request) {
    return this.onWatch(message);
  }
  if ('webrtcup' === message.janus) {
    return this.onWebrtcup(message);
  }
  if ('hangup' === message.janus) {
    return this.onHangup(message);
  }
  if ('detach' === message.janus) {
    return this.onDetach(message);
  }
  return Promise.resolve();
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginStreaming.prototype.onCreate = function(message) {
  var self = this;
  return auth.canPublish(message.token, message.body.id)
    .then(function() {
      self.proxyConnection.transaction.add(message.transaction, function(response) {
        self.stream = Stream.generate(request.body.id, self.proxyConnection);
        logger.info('adding stream', self.stream);
        streams.add(self.stream);
        self.proxyConnection.transactions.remove(message.transaction);
      });
      return Promise.resolve(message);
    });
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginStreaming.prototype.onWatch = function(message) {
  var self = this;
  return auth.canSubscribe(message.session_id, message.body.id)
    .then(function() {
      self.proxyConnection.transactions.add(message.transaction, function(response) {
        self.stream = Stream.generate(message.body.id, self.proxyConnection);
        logger.info('adding stream', self.stream);
        streams.add(self.stream);
        self.proxyConnection.transactions.remove(message.transaction);
      });
      return Promise.resolve(message);
    });
};


/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginStreaming.prototype.onWebrtcup = function(message) {
  cmApiClient.subscribe(this.stream.channelName, this.stream.id, Date.now());
  return Promise.resolve(message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginStreaming.prototype.onHangup = function(message) {
  this.proxyConnection.browserConnection.close();
  return Promise.resolve(message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginStreaming.prototype.onDetach = function(message) {
  this.proxyConnection.removePlugin(this.id);
  return Promise.resolve(message);
};

module.exports = PluginStreaming;