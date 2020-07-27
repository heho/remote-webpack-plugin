'use strict';

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function combineHttpAuth(map) {
  // auth = user:password
  var domains = Object.getOwnPropertyNames(map);
  for (var i = 0, len = domains.length; i < len; i++) {
    var item = map[domains[i]];
    if (item.user) {
      item.auth = item.user;
      delete item.user;
      if (item.password) {
        item.auth += ':' + item.password;
        delete item.password;
      }
    }
  }
}

var regexProtocols = /^(http|ftp)s?:\/\/.+/;

function checkProtocol(request) {
  return regexProtocols.test(request);
}

function DownloadWebpackPlugin(options) {
  this.options = options;
  if (options && options.http) {
    combineHttpAuth(options.http);
  }
}

DownloadWebpackPlugin.prototype.apply = function WebpackPluginRemoteApply(compiler) {
  var options = this.options;


  compiler.hooks.beforeCompile.tapAsync('before-compile', function (params, callback) {
    params.normalModuleFactory.hooks.afterResolve.tapAsync('after-resolve', function (result, callback2) {
      if (checkProtocol(result.resource)) {
        // append loader
        var loaderPath = _path2.default.join(__dirname, '/loader.js');
        result.loaders.push({ loader: loaderPath, options: options });
        result.request = result.request.substr(0, result.request.lastIndexOf('!') + 1) + loaderPath + '!' + result.resource;
      }
      callback2(null, result);
    });

    callback();
  });

  compiler.hooks.afterResolvers.tap('after-resolvers', function (compiler) {
    compiler.resolverFactory.plugin('resolver normal', function (resolver) {
      resolver.hooks.resolve.tapAsync('before-described-resolve', function (params, context, callback) {
        if (checkProtocol(params.request)) {
          params.module = false;
          params.path = params.request;
          params.request = undefined;

          resolver.doResolve(resolver.hooks.resolved, params, 'download: url is resolved - ' + params.path, context, callback);
        } else {
          callback();
        }
      });
    });
  });
};

// export default DownloadWebpackPlugin;
module.exports = DownloadWebpackPlugin;