'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.pitch = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _url2 = require('url');

var _url3 = _interopRequireDefault(_url2);

var _fs2 = require('fs');

var _fs3 = _interopRequireDefault(_fs2);

var _http2 = require('http');

var _http3 = _interopRequireDefault(_http2);

var _https = require('https');

var _https2 = _interopRequireDefault(_https);

var _ftp = require('ftp');

var _ftp2 = _interopRequireDefault(_ftp);

var _keyv = require('keyv');

var _keyv2 = _interopRequireDefault(_keyv);

var _keyvFs = require('keyv-fs');

var _keyvFs2 = _interopRequireDefault(_keyvFs);

var _httpCacheSemantics = require('http-cache-semantics');

var _httpCacheSemantics2 = _interopRequireDefault(_httpCacheSemantics);

var _cacheableRequestAdaptable = require('cacheable-request-adaptable');

var _cacheableRequestAdaptable2 = _interopRequireDefault(_cacheableRequestAdaptable);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var NewCachePolicy = function (_CachePolicy) {
  _inherits(NewCachePolicy, _CachePolicy);

  function NewCachePolicy() {
    _classCallCheck(this, NewCachePolicy);

    return _possibleConstructorReturn(this, (NewCachePolicy.__proto__ || Object.getPrototypeOf(NewCachePolicy)).apply(this, arguments));
  }

  _createClass(NewCachePolicy, [{
    key: 'storable',
    value: function storable() {
      // eslint-disable-line class-methods-use-this
      return true;
    }
  }]);

  return NewCachePolicy;
}(_httpCacheSemantics2.default);

function handleStreamError(ctx, error, callback) {
  if (ctx.cache) {
    ctx.cache.get(ctx.cacheKey).then(function (response) {
      return callback(null, response.body || response);
    }, callback);
  } else {
    callback(error || new Error('Fail to dowload: ' + ctx.href + ' - ' + ctx.statusCode));
  }
}

function handleStream(stream, toSave, callback) {
  var bufferList = [];
  stream.on('data', function (d) {
    bufferList.push(d);
  });
  stream.on('end', function () {
    var data = Buffer.concat(bufferList);
    if (toSave && stream.cache) {
      stream.cache.set(stream.cacheKey, { body: data });
    }
    callback(null, data);
  });
  stream.on('aborted', function (err) {
    handleStreamError(stream, err, callback);
  });
  stream.on('error', function (err) {
    handleStreamError(stream, err, callback);
  });
}

function setCache(ctx, cacheableRequest, cacheKey) {
  if (cacheableRequest) {
    ctx.cache = cacheableRequest.cache;
    ctx.cacheKey = cacheKey;
  }
}
function loadHttp(config, callback, store) {
  var cacheableRequest = void 0;
  var request = void 0;
  if (store) {
    cacheableRequest = new _cacheableRequestAdaptable2.default(config.protocol === 'https:' ? _https2.default.request : _http3.default.request, {
      cacheAdapter: store,
      policyConstructor: NewCachePolicy,
      namespace: store.namespace
    });
    request = cacheableRequest.createRequest();
  } else {
    var _http = config.protocol === 'https:' ? _https2.default : _http3.default;
    request = _http.request;
  }

  var cacheKey = void 0;
  var incomeMsg = request(config, function (stream) {
    if (stream.statusCode === 200) {
      setCache(stream, cacheableRequest, cacheKey);
      stream.href = config.href;
      handleStream(stream, false, callback);
    } else {
      setCache(config, cacheableRequest, cacheKey);
      handleStreamError(config, null, callback);
    }
  });
  incomeMsg.on('cacheKey', function (key) {
    cacheKey = key;
  });
  incomeMsg.on('request', function (req) {
    req.end();
  });
  incomeMsg.on('error', function (err) {
    setCache(config, cacheableRequest, cacheKey);
    handleStreamError(config, err, callback);
  });
}

function loadFtp(config, callback, store) {
  store = new _keyv2.default({
    store: store,
    namespace: store.namespace
  });
  function getCtx() {
    return {
      cacheKey: config.href,
      href: config.href,
      cache: store
    };
  }
  function handleError(err) {
    handleStreamError(getCtx(), err, callback);
  }
  function getCallback(err, stream) {
    if (err) {
      handleError(err);
    } else {
      Object.assign(stream, getCtx());
      handleStream(stream, true, callback);
    }
  }
  var ftp = new _ftp2.default();
  ftp.on('ready', function () {
    ftp.get(config.path, getCallback);
  }).on('error', function (err) {
    handleError(err);
  });

  config.host = config.hostname;
  ftp.connect(config);
}

function findConfig(config, _url) {
  var props = Object.getOwnPropertyNames(config);
  for (var i = 0, len = props.length; i < len; i++) {
    if (new RegExp(props[i]).test(_url)) {
      return config[props[i]];
    }
  }
  return undefined;
}

function pitch(request) {
  var options = this.query || {};
  var callback = this.async();
  var parsedUrl = _url3.default.parse(request);

  var load = void 0;
  var config = void 0;
  if (parsedUrl.protocol) {
    if (parsedUrl.protocol.startsWith('http')) {
      config = options.http && findConfig(options.http, request);
      load = loadHttp;
    } else if (parsedUrl.protocol.startsWith('ftp')) {
      config = options.ftp && findConfig(options.ftp, request);
      load = loadFtp;
    }
  }
  if (!load) {
    callback(new Error('download: the protocol is not supported - ' + request));
    return;
  }
  if (config) {
    config = Object.assign({}, config);
    config = Object.assign(config, parsedUrl);
  } else {
    config = parsedUrl;
  }
  var allowCache = config.cache;
  if (allowCache === undefined) {
    allowCache = options.cacheDir;
  }
  if (allowCache === undefined) {
    allowCache = true;
  }

  var store = void 0;
  if (allowCache) {
    var _fs = this._compiler.inputFileSystem;
    if (!_fs.readFile || !_fs.writeFile) {
      // no complete APIs, we assume its local file system.
      _fs = _fs3.default;
    }
    store = new _keyvFs2.default(_fs);
    var namespace = typeof options.cacheDir === 'string' ? options.cacheDir : '__download_cache__';
    store.namespace = namespace;
  }

  load(config, callback, store);
}
// eslint-disable-next-line
exports.pitch = pitch;