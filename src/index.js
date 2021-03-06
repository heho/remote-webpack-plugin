import path from 'path';

function combineHttpAuth(map) {
  // auth = user:password
  const domains = Object.getOwnPropertyNames(map);
  for (let i = 0, len = domains.length; i < len; i++) {
    const item = map[domains[i]];
    if (item.user) {
      item.auth = item.user;
      delete item.user;
      if (item.password) {
        item.auth += `:${item.password}`;
        delete item.password;
      }
    }
  }
}

const regexProtocols = /^(http|ftp)s?:\/\/.+/;

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
  const { options } = this;


  compiler.hooks.beforeCompile.tapAsync('before-compile', (params, callback) => {
    params.normalModuleFactory.hooks.afterResolve.tapAsync('after-resolve', (result, callback2) => {
      if (checkProtocol(result.resource)) {
        // append loader
        var loaderPath = path.join(__dirname, '/loader.js');
        result.loaders.push({ loader: loaderPath, options });
        result.request = result.request.substr(0, result.request.lastIndexOf('!') + 1) + loaderPath + '!' + result.resource;
      }
      callback2(null, result);
    });

    callback();
  });


  compiler.hooks.afterResolvers.tap('after-resolvers', (compiler) => {
    compiler.resolverFactory.plugin('resolver normal', resolver => {
      resolver.hooks.resolve.tapAsync('before-described-resolve', (params, context, callback) => {
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
