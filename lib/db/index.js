/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const unbuf = require('buf').unbuf.hex;

const P = require('../promise');

const config = require('../config');
const encrypt = require('../encrypt');
const logger = require('../logging').getLogger('fxa.db');
const klass = config.get('db.driver') === 'mysql' ?
  require('./mysql') : require('./memory');

function clientEquals(client, other) {
  var props = Object.keys(client);
  for (var i = 0; i < props.length; i++) {
    var prop = props[i];
    logger.verbose('comparing %s', prop);
    var clientProp = unbuf(client[prop]);
    var otherProp = unbuf(other[prop]);
    if (clientProp !== otherProp) {
      logger.debug('Clients differ on %s: %s vs %s',
        prop, clientProp, otherProp);
      return false;
    }
  }
  return true;
}

function convertClientToConfigFormat(client) {
  var out = {};
  for (var key in client) {
    if (key === 'createdAt') {
      continue;
    } else if (key === 'secret') {
      out.hashedSecret = unbuf(client.secret);
    } else if (key === 'whitelisted' || key === 'canGrant') {
      out[key] = !!client[key]; // db stores booleans as 0 or 1.
    } else if (typeof client[key] !== 'function') {
      out[key] = unbuf(client[key]);
    }
  }
  return out;
}

function preClients() {
  var clients = config.get('clients');
  if (clients && clients.length) {
    logger.debug('Loading pre-defined clients: %:2j', clients);
    return P.all(clients.map(function(c) {
      if (c.secret) {
        logger.error('Do not keep client secrets in the config file.'
          + ' Use the `hashedSecret` field instead.\n\n'
          + '\tclient=%s has `secret` field\n'
          + '\tuse hashedSecret="%s" instead',
          c.id,
          unbuf(encrypt.hash(c.secret)));
        process.exit(1);
      }
      // ensure booleans are boolean and not undefined
      c.whitelisted = !!c.whitelisted;
      c.canGrant = !!c.canGrant;
      return exports.getClient(c.id).then(function(client) {
        if (client) {
          client = convertClientToConfigFormat(client);
          logger.info('Client %s exists, comparing...', c.id);
          if (clientEquals(client, c)) {
            logger.info('Client %s is the same, skipping...', c.id);
          } else {
            logger.warn('Client %s differs, updating!\n'
              + 'Before: %:2j\nAfter: %:2j', c.id, client, c);
            return exports.updateClient(c);
          }
        } else {
          return exports.registerClient(c);
        }
      });
    }));
  }
}

var driver;
function withDriver() {
  if (driver) {
    return P.resolve(driver);
  }
  var p;
  if (config.get('db.driver') === 'mysql') {
    p = klass.connect(config.get('mysql'));
  } else {
    p = klass.connect();
  }
  return p.then(function(store) {
    logger.debug('connected to "%s" store', config.get('db.driver'));
    driver = store;
  }).then(preClients).then(function() {
    return driver;
  });
}

const proxyReturn = logger.isEnabledFor(logger.VERBOSE) ?
  function verboseReturn(promise, method) {
    return promise.then(function(ret) {
      logger.verbose('proxied %s < %j', method, ret);
      return ret;
    });
  } : function identity(x) {
    return x;
  };

function proxy(method) {
  return function proxied() {
    var args = arguments;
    return withDriver().then(function(driver) {
      logger.verbose('proxying %s > %j', method, args);
      return proxyReturn(driver[method].apply(driver, args), method);
    }).catch(function(err) {
      logger.error('%s: %s', method, err);
      throw err;
    });
  };
}


Object.keys(klass.prototype).forEach(function(key) {
  exports[key] = proxy(key);
});

exports.disconnect = function disconnect() {
  driver = null;
};

exports._initialClients = function() {
  return preClients();
};