'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _regeneratorRuntime = _interopDefault(require('@babel/runtime/regenerator'));
var _asyncToGenerator = _interopDefault(require('@babel/runtime/helpers/asyncToGenerator'));
var _classCallCheck = _interopDefault(require('@babel/runtime/helpers/classCallCheck'));
var _createClass = _interopDefault(require('@babel/runtime/helpers/createClass'));
var bunyan = _interopDefault(require('bunyan'));
var express = _interopDefault(require('express'));
var mongoose = _interopDefault(require('mongoose'));
var leftPad = _interopDefault(require('left-pad'));
var cookieParser = _interopDefault(require('cookie-parser'));
var bodyParser = _interopDefault(require('body-parser'));
var cors = _interopDefault(require('cors'));
var uuid = _interopDefault(require('uuid'));
var _ = _interopDefault(require('lodash'));
var jwt = _interopDefault(require('jsonwebtoken'));
var bcrypt = _interopDefault(require('bcryptjs'));
var Promise$1 = _interopDefault(require('bluebird'));
var _defineProperty = _interopDefault(require('@babel/runtime/helpers/defineProperty'));
var jwt$1 = _interopDefault(require('express-jwt'));
var uniqid = _interopDefault(require('uniqid'));
var crypto = _interopDefault(require('crypto'));
var nodemailer = _interopDefault(require('nodemailer'));
var smtpTransport = _interopDefault(require('nodemailer-smtp-transport'));
var expressAsyncRouter = require('express-async-router');

global.__DEV__ = false; // __STAGE__

global.__PROD__ = true;
var config = {
  name: 'Your super app',
  port: 3001,
  db: {
    url: 'mongodb://localhost/test'
  },
  jwt: {
    secret: 'YOUR_SECRET'
  },
  nodemailer: {
    service: 'mail',
    host: 'smtp.mail.ru',
    auth: {
      user: 'molodoyrustik@mail.ru',
      pass: 'molodoy'
    }
  }
};

function levelFn(data) {
  if (data.err || data.status >= 500 || data.duration > 10000) {
    // server internal error or error
    return 'error';
  } else if (data.status >= 400 || data.duration > 3000) {
    // client error
    return 'warn';
  }

  return 'info';
}

function logStart(data) {
  return "".concat(leftPad(data.method, 4), " ").concat(data.url, " started reqId=").concat(data.reqId);
}

function logFinish(data) {
  var time = (data.duration || 0).toFixed(3);
  var length = data.length || 0;
  return "".concat(leftPad(data.method, 4), " ").concat(data.url, " ").concat(leftPad(data.status, 3), " ").concat(leftPad(time, 7), "ms ").concat(leftPad(length, 5), "b reqId=").concat(data.reqId);
}

var accessLogger = (function (params) {
  return [function (req, res, next) {
    var data = {};
    if (!req.log) throw 'has no req.log!';
    var log = req.log.child({
      component: 'req'
    });
    data.reqId = req.reqId;
    data.method = req.method;
    if (req.ws) data.method = 'WS';
    data.host = req.headers.host;
    data.url = (req.baseUrl || '') + (req.url || '-');
    data.referer = req.header('referer') || req.header('referrer');
    data.ip = req.ip || req.connection.remoteAddress || req.socket && req.socket.remoteAddress || req.socket.socket && req.socket.socket.remoteAddress || '127.0.0.1';

    if (__DEV__) {
      log.debug(data, logStart(data));

      if (req.body) {
        log.trace(JSON.stringify(req.body));
      }
    }

    var hrtime = process.hrtime();

    function logging() {
      data.status = res.statusCode;
      data.length = res.getHeader('Content-Length');
      var diff = process.hrtime(hrtime);
      data.duration = diff[0] * 1e3 + diff[1] * 1e-6;
      log[levelFn(data)](data, logFinish(data));
    }

    res.on('finish', logging);
    res.on('close', logging);
    next();
  }];
});

var reqParser = (function (ctx) {
  return [bodyParser.json(), bodyParser.urlencoded({
    extended: true
  }), cookieParser(), cors()];
});

var catchError = (function (ctx) {
  return function (err, req, res, next) {
    if (req && req.log && req.log.error) {
      req.log.error({
        err: err,
        query: req.query,
        body: req.body,
        headers: req.headers
      }, (err || {}).stack);
    } else {
      console.log(err);
    }

    res.status(err.status || 500);
    return res.json([]);
    if (res.err) return res.err(err);
    return res.json(err);
  };
});

var reqLog = (function (params) {
  return [function (req, res, next) {
    if (__PROD__) {
      req.reqId = uuid.v4();
    } else {
      global.reqId = 1 + (global.reqId || 0);
      req.reqId = global.reqId;
    }

    if (params.log) {
      req.log = params.log.child({
        reqId: req.reqId
      });
    }

    next();
  }];
});

var extendReqRes = (function (ctx) {
  return [function (req, res, next) {
    if (ctx.requests) {
      _.forEach(ctx.requests, function (val, key) {
        req[key] = val.bind(req);
      }); // if (req.allParams) {
      //   req.params = req.allParams.bind(req)()
      // }

    }

    if (ctx.responses) {
      _.forEach(ctx.responses, function (val, key) {
        res[key] = val.bind(res);
      });
    }

    next();
  }];
});

// fs
function _getMiddlewares (ctx) {
  return {
    accessLogger: accessLogger.apply(void 0, arguments),
    reqParser: reqParser.apply(void 0, arguments),
    catchError: catchError.apply(void 0, arguments),
    reqLog: reqLog.apply(void 0, arguments),
    extendReqRes: extendReqRes.apply(void 0, arguments)
  };
}

var WorksSchema = new mongoose.Schema({
  id: {
    type: String,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  technologies: {
    type: String,
    required: true,
    trim: true
  },
  imgUrl: {
    type: String,
    required: true,
    trim: true
  }
});

var PostSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Number,
    required: true,
    trim: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  }
});

var SkillSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    trim: true
  },
  groupId: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  value: {
    type: Number,
    required: true,
    trim: true
  }
});

var GroupsSkills = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  skills: [SkillSchema]
});

var bcryptGenSalt = Promise$1.promisify(bcrypt.genSalt);
var bcryptHash = Promise$1.promisify(bcrypt.hash);
var bcryptCompare = Promise$1.promisify(bcrypt.compare);
var User = (function (ctx) {
  if (!ctx.log) throw '!log';
  var schema = new mongoose.Schema({
    email: {
      type: String,
      required: true,
      trim: true
    },
    id: {
      type: String,
      trim: true
    },
    password: {
      type: String
    },
    forgotEmailToken: {
      type: String,
      trim: true
    },
    works: [WorksSchema],
    posts: [PostSchema],
    groupsSkills: [GroupsSkills]
  }, {
    collection: 'user',
    timestamps: true
  });

  schema.statics.isValidEmail = function (email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  };

  schema.statics.generatePassword = function () {
    var length = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;
    return Math.random().toString(36).substr(2, length);
  };

  schema.methods.toJSON = function () {
    return _.omit(this.toObject(), ['password']);
  };

  schema.methods.getIdentity = function (params) {
    var object = _.pick(this.toObject(), ['_id', 'email', 'id']);

    if (!params) return object;
    return Object.assign(object, params);
  };

  schema.methods.generateAuthToken = function (params) {
    return jwt.sign(this.getIdentity(params), ctx.config.jwt.secret);
  };

  schema.methods.verifyPassword =
  /*#__PURE__*/
  function () {
    var _ref = _asyncToGenerator(
    /*#__PURE__*/
    _regeneratorRuntime.mark(function _callee(password) {
      return _regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return bcryptCompare(password, this.password);

            case 2:
              return _context.abrupt("return", _context.sent);

            case 3:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, this);
    }));

    return function (_x) {
      return _ref.apply(this, arguments);
    };
  }();

  var SALT_WORK_FACTOR = 10;
  schema.pre('save', function (next) {
    var _this = this;

    if (!this.isModified('password')) return next();
    return bcryptGenSalt(SALT_WORK_FACTOR).then(function (salt) {
      bcryptHash(_this.password, salt).then(function (hash) {
        _this.password = hash;
        next();
      });
    })["catch"](next);
  });
  return mongoose.model('User', schema);
});

function _getModels () {
  return {
    User: User.apply(void 0, arguments)
  };
}

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { keys.push.apply(keys, Object.getOwnPropertySymbols(object)); } if (enumerableOnly) keys = keys.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }
var Auth = (function (ctx) {
  var User = ctx.models.User;
  var transporter = ctx.utils.Transporter;
  var controller = {};

  controller.validate =
  /*#__PURE__*/
  function () {
    var _ref = _asyncToGenerator(
    /*#__PURE__*/
    _regeneratorRuntime.mark(function _callee(req, res) {
      var user;
      return _regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              if (!req.user) {
                _context.next = 7;
                break;
              }

              _context.next = 3;
              return User.findOne({
                id: req.user.id
              });

            case 3:
              user = _context.sent;

              if (user) {
                _context.next = 6;
                break;
              }

              return _context.abrupt("return", res.status(404).json([{
                validate: false,
                message: 'Пользователь не найден в базе'
              }]));

            case 6:
              return _context.abrupt("return", [{
                validate: true,
                __pack: 1,
                jwt: req.user,
                user: user
              }]);

            case 7:
              return _context.abrupt("return", res.status(404).json([{
                validate: false,
                message: 'Пользователь не найден в базе'
              }]));

            case 8:
            case "end":
              return _context.stop();
          }
        }
      }, _callee);
    }));

    return function (_x, _x2) {
      return _ref.apply(this, arguments);
    };
  }();

  controller.getUserFields = function (req) {
    return req.body;
  };

  controller.validationUserFields = function (userFields, res) {
    var valid = {
      isValid: false,
      message: []
    };

    if (!userFields.captcha) {
      valid.isValid = true;
      valid.message = [{
        signup: false,
        message: 'Параметр captcha не передан или введен неверно'
      }];
    }

    if (!userFields.email || !userFields.password) {
      valid.isValid = true;
      valid.message = [{
        signup: false,
        message: 'Параметрs email или password не передан'
      }];
    }

    return valid;
  };

  controller.getUserCriteria = function (req, res) {
    var params = req.body;

    if (params.email) {
      return {
        email: params.email
      };
    }

    return res.status(400).json([{
      signup: false,
      message: 'Параметр email не передан'
    }]);
  };

  controller.signup =
  /*#__PURE__*/
  function () {
    var _ref2 = _asyncToGenerator(
    /*#__PURE__*/
    _regeneratorRuntime.mark(function _callee2(req, res) {
      var userFields, valid, criteria, existUser, user, result;
      return _regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _context2.prev = 0;
              userFields = controller.getUserFields(req, res);
              valid = controller.validationUserFields(userFields, res);

              if (!valid.isValid) {
                _context2.next = 5;
                break;
              }

              return _context2.abrupt("return", res.status(400).json(valid.message));

            case 5:
              criteria = controller.getUserCriteria(req, res);
              _context2.next = 8;
              return User.findOne(criteria);

            case 8:
              existUser = _context2.sent;

              if (!existUser) {
                _context2.next = 11;
                break;
              }

              return _context2.abrupt("return", res.status(400).json([{
                signup: false,
                message: 'Такой email зарегистрирован'
              }]));

            case 11:
              user = new User(_objectSpread({}, userFields, {
                id: uniqid(),
                forgotEmailToken: ''
              }));
              _context2.next = 14;
              return user.save();

            case 14:
              result = [{
                signup: true,
                user: user,
                token: user.generateAuthToken()
              }];
              return _context2.abrupt("return", res.json(result));

            case 18:
              _context2.prev = 18;
              _context2.t0 = _context2["catch"](0);
              console.log(_context2.t0);
              return _context2.abrupt("return", res.status(500).json(_context2.t0));

            case 22:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, null, [[0, 18]]);
    }));

    return function (_x3, _x4) {
      return _ref2.apply(this, arguments);
    };
  }();

  controller.signin =
  /*#__PURE__*/
  function () {
    var _ref3 = _asyncToGenerator(
    /*#__PURE__*/
    _regeneratorRuntime.mark(function _callee3(req, res) {
      var params, criteria, user;
      return _regeneratorRuntime.wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              params = controller.getUserFields(req, res);

              if (params.password) {
                _context3.next = 3;
                break;
              }

              return _context3.abrupt("return", res.status(400).json([{
                login: false,
                message: 'Параметр password не передан'
              }]));

            case 3:
              criteria = controller.getUserCriteria(req);
              _context3.next = 6;
              return User.findOne(criteria);

            case 6:
              user = _context3.sent;

              if (user) {
                _context3.next = 9;
                break;
              }

              return _context3.abrupt("return", res.status(404).json([{
                login: false,
                message: 'Такой пользователь не найден'
              }]));

            case 9:
              _context3.next = 11;
              return user.save();

            case 11:
              _context3.next = 13;
              return user.verifyPassword(params.password);

            case 13:
              if (_context3.sent) {
                _context3.next = 15;
                break;
              }

              return _context3.abrupt("return", res.status(400).json([{
                login: false,
                message: 'Переданный пароль не подходит'
              }]));

            case 15:
              return _context3.abrupt("return", res.json([{
                __pack: 1,
                login: true,
                user: user,
                token: user.generateAuthToken()
              }]));

            case 16:
            case "end":
              return _context3.stop();
          }
        }
      }, _callee3);
    }));

    return function (_x5, _x6) {
      return _ref3.apply(this, arguments);
    };
  }();

  controller.forgot =
  /*#__PURE__*/
  function () {
    var _ref4 = _asyncToGenerator(
    /*#__PURE__*/
    _regeneratorRuntime.mark(function _callee4(req, res) {
      var params, criteria, user, token, siteUrl, mailText, mailOptions, result;
      return _regeneratorRuntime.wrap(function _callee4$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              params = controller.getUserFields(req, res);

              if (params.email) {
                _context4.next = 3;
                break;
              }

              return _context4.abrupt("return", res.status(400).json([{
                forgot: false,
                message: 'Параметр email не передан'
              }]));

            case 3:
              criteria = controller.getUserCriteria(req);
              _context4.next = 6;
              return User.findOne(criteria);

            case 6:
              user = _context4.sent;

              if (user) {
                _context4.next = 9;
                break;
              }

              return _context4.abrupt("return", res.status(404).json([{
                login: false,
                message: 'Пользователь с таким email не найден в базе'
              }]));

            case 9:
              _context4.next = 11;
              return crypto.randomBytes(32);

            case 11:
              token = _context4.sent;
              user.forgotEmailToken = token.toString('hex');
              _context4.next = 15;
              return user.save();

            case 15:
              siteUrl = 'http://localhost:3000/';

              if (__PROD__) {
                siteUrl = 'http://app.ashlie.io/';
              }

              mailText = "\u041F\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u043F\u043E \u0441\u0441\u044B\u043B\u043A\u0435 \u0447\u0442\u043E\u0431\u044B \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u043F\u0430\u0440\u043E\u043B\u044C ".concat(siteUrl, "auth/forgot/").concat(user.forgotEmailToken);
              mailOptions = {
                from: 'molodoyrustik@mail.ru',
                to: user.email,
                subject: 'Восстановления пароля сайта Ashile.io',
                text: mailText
              };
              _context4.next = 21;
              return transporter.sendMail(mailOptions);

            case 21:
              result = [{
                __pack: 1,
                forgot: true
              }];
              return _context4.abrupt("return", res.json(result));

            case 23:
            case "end":
              return _context4.stop();
          }
        }
      }, _callee4);
    }));

    return function (_x7, _x8) {
      return _ref4.apply(this, arguments);
    };
  }();

  controller.checkForgotToken =
  /*#__PURE__*/
  function () {
    var _ref5 = _asyncToGenerator(
    /*#__PURE__*/
    _regeneratorRuntime.mark(function _callee5(req, res) {
      var forgotEmailToken, criteria, user;
      return _regeneratorRuntime.wrap(function _callee5$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              forgotEmailToken = req.params.forgotEmailToken;

              if (forgotEmailToken) {
                _context5.next = 3;
                break;
              }

              return _context5.abrupt("return", res.status(400).json([{
                checkForgotToken: false,
                message: 'Токен не был передан'
              }]));

            case 3:
              criteria = {
                forgotEmailToken: forgotEmailToken
              };
              _context5.next = 6;
              return User.findOne(criteria);

            case 6:
              user = _context5.sent;

              if (user) {
                _context5.next = 9;
                break;
              }

              return _context5.abrupt("return", res.status(404).json([{
                checkForgotToken: false,
                message: 'Пользователь с таким токеном не найден'
              }]));

            case 9:
              return _context5.abrupt("return", res.json([{
                __pack: 1,
                checkForgotToken: true
              }]));

            case 10:
            case "end":
              return _context5.stop();
          }
        }
      }, _callee5);
    }));

    return function (_x9, _x10) {
      return _ref5.apply(this, arguments);
    };
  }();

  controller.reset =
  /*#__PURE__*/
  function () {
    var _ref6 = _asyncToGenerator(
    /*#__PURE__*/
    _regeneratorRuntime.mark(function _callee6(req, res) {
      var params, password, checkPassword, forgotEmailToken, criteria, user;
      return _regeneratorRuntime.wrap(function _callee6$(_context6) {
        while (1) {
          switch (_context6.prev = _context6.next) {
            case 0:
              params = controller.getUserFields(req, res);
              password = params.password, checkPassword = params.checkPassword, forgotEmailToken = params.forgotEmailToken;

              if (password) {
                _context6.next = 4;
                break;
              }

              return _context6.abrupt("return", res.status(400).json([{
                reset: false,
                message: 'Параметр password не передан'
              }]));

            case 4:
              if (checkPassword) {
                _context6.next = 6;
                break;
              }

              return _context6.abrupt("return", res.status(400).json([{
                reset: false,
                message: 'Параметр checkPassword не передан'
              }]));

            case 6:
              if (!(password !== checkPassword)) {
                _context6.next = 8;
                break;
              }

              return _context6.abrupt("return", res.status(400).json([{
                reset: false,
                message: 'Пароли не совпадают'
              }]));

            case 8:
              if (forgotEmailToken) {
                _context6.next = 10;
                break;
              }

              return _context6.abrupt("return", res.status(400).json([{
                reset: false,
                message: 'Параметр forgotEmailToken не передан'
              }]));

            case 10:
              criteria = {
                forgotEmailToken: forgotEmailToken
              };
              _context6.next = 13;
              return User.findOne(criteria);

            case 13:
              user = _context6.sent;

              if (user) {
                _context6.next = 16;
                break;
              }

              return _context6.abrupt("return", res.status(404).json([{
                reset: false,
                message: 'Не корректный токен'
              }]));

            case 16:
              user.forgotEmailToken = '';
              user.password = password;
              _context6.next = 20;
              return user.save();

            case 20:
              return _context6.abrupt("return", res.json([{
                __pack: 1,
                reset: true
              }]));

            case 21:
            case "end":
              return _context6.stop();
          }
        }
      }, _callee6);
    }));

    return function (_x11, _x12) {
      return _ref6.apply(this, arguments);
    };
  }();

  controller.getToken = function (req) {
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
      return req.headers.authorization.split(' ')[1];
    } else if (req.headers['x-access-token']) {
      return req.headers['x-access-token'];
    } else if (req.query && req.query.token) {
      return req.query.token;
    } else if (req.cookies && req.cookies.token) {
      return req.cookies.token;
    }

    if (__DEV__ && ctx.config && ctx.config.jwt && ctx.config.jwt.devToken) return ctx.config.jwt.devToken;
    return null;
  };

  controller.parseToken = function (req, res, next) {
    var token = controller.getToken(req);
    req.token = token;
    next();
  };

  controller.parseUser = function (req, res, next) {
    var options = {
      secret: ctx.config && ctx.config.jwt.secret || 'SECRET',
      getToken: function getToken(req) {
        return req.token;
      }
    };
    jwt$1(options)(req, res, function (err) {
      if (err) req._errJwt = err;
      next();
    });
  };

  controller.isAuth = function (req, res, next) {
    if (req._errJwt) return next(req._errJwt);
    if (!req.user || !req.user._id) return res.status(401).send('!req.user');
    next();
  };

  return controller;
});

var User$1 = (function (ctx) {
  var User = ctx.models.User;
  var controller = {};

  controller.get =
  /*#__PURE__*/
  function () {
    var _ref = _asyncToGenerator(
    /*#__PURE__*/
    _regeneratorRuntime.mark(function _callee(req, res) {
      var userID, user;
      return _regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              userID = req.user.id;
              _context.next = 3;
              return User.findOne({
                id: userID
              });

            case 3:
              user = _context.sent;
              return _context.abrupt("return", res.json(user));

            case 5:
            case "end":
              return _context.stop();
          }
        }
      }, _callee);
    }));

    return function (_x, _x2) {
      return _ref.apply(this, arguments);
    };
  }();

  controller.getWorks =
  /*#__PURE__*/
  function () {
    var _ref2 = _asyncToGenerator(
    /*#__PURE__*/
    _regeneratorRuntime.mark(function _callee2(req, res) {
      var userID, user;
      return _regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              userID = req.params.id;
              _context2.next = 3;
              return User.findOne({
                id: userID
              });

            case 3:
              user = _context2.sent;
              return _context2.abrupt("return", res.json(user.works));

            case 5:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2);
    }));

    return function (_x3, _x4) {
      return _ref2.apply(this, arguments);
    };
  }();

  controller.addWork =
  /*#__PURE__*/
  function () {
    var _ref3 = _asyncToGenerator(
    /*#__PURE__*/
    _regeneratorRuntime.mark(function _callee3(req, res) {
      var params, title, technologies, imgUrl, userID, user, work;
      return _regeneratorRuntime.wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              params = req.body;

              if (params.title) {
                _context3.next = 3;
                break;
              }

              return _context3.abrupt("return", res.status(400).json([{
                signup: false,
                message: 'Заполните все поля'
              }]));

            case 3:
              if (params.technologies) {
                _context3.next = 5;
                break;
              }

              return _context3.abrupt("return", res.status(400).json([{
                signup: false,
                message: 'Заполните все поля'
              }]));

            case 5:
              if (params.imgUrl) {
                _context3.next = 7;
                break;
              }

              return _context3.abrupt("return", res.status(400).json([{
                signup: false,
                message: 'Заполните все поля'
              }]));

            case 7:
              title = params.title, technologies = params.technologies, imgUrl = params.imgUrl;
              userID = req.user.id;
              _context3.next = 11;
              return User.findOne({
                id: userID
              });

            case 11:
              user = _context3.sent;
              work = {
                id: uniqid(),
                title: title,
                technologies: technologies,
                imgUrl: imgUrl
              };
              user.works.push(work);
              _context3.next = 16;
              return user.save();

            case 16:
              return _context3.abrupt("return", res.json([{
                flag: true,
                message: 'Проект успешно добавлен'
              }]));

            case 17:
            case "end":
              return _context3.stop();
          }
        }
      }, _callee3);
    }));

    return function (_x5, _x6) {
      return _ref3.apply(this, arguments);
    };
  }();

  controller.getPosts =
  /*#__PURE__*/
  function () {
    var _ref4 = _asyncToGenerator(
    /*#__PURE__*/
    _regeneratorRuntime.mark(function _callee4(req, res) {
      var userID, user;
      return _regeneratorRuntime.wrap(function _callee4$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              userID = req.params.id;
              _context4.next = 3;
              return User.findOne({
                id: userID
              });

            case 3:
              user = _context4.sent;
              return _context4.abrupt("return", res.json(user.posts));

            case 5:
            case "end":
              return _context4.stop();
          }
        }
      }, _callee4);
    }));

    return function (_x7, _x8) {
      return _ref4.apply(this, arguments);
    };
  }();

  controller.addPost =
  /*#__PURE__*/
  function () {
    var _ref5 = _asyncToGenerator(
    /*#__PURE__*/
    _regeneratorRuntime.mark(function _callee5(req, res) {
      var params, title, date, text, userID, user, post;
      return _regeneratorRuntime.wrap(function _callee5$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              params = req.body;

              if (params.title) {
                _context5.next = 3;
                break;
              }

              return _context5.abrupt("return", res.status(400).json([{
                signup: false,
                message: 'Заполните все поля'
              }]));

            case 3:
              if (params.date) {
                _context5.next = 5;
                break;
              }

              return _context5.abrupt("return", res.status(400).json([{
                signup: false,
                message: 'Заполните все поля'
              }]));

            case 5:
              if (params.text) {
                _context5.next = 7;
                break;
              }

              return _context5.abrupt("return", res.status(400).json([{
                signup: false,
                message: 'Заполните все поля'
              }]));

            case 7:
              title = params.title, date = params.date, text = params.text;
              userID = req.user.id;
              _context5.next = 11;
              return User.findOne({
                id: userID
              });

            case 11:
              user = _context5.sent;
              post = {
                id: uniqid(),
                title: title,
                date: date,
                text: text
              };
              user.posts.push(post);
              _context5.next = 16;
              return user.save();

            case 16:
              return _context5.abrupt("return", res.json([{
                flag: true,
                message: 'Пост успешно добавлен'
              }]));

            case 17:
            case "end":
              return _context5.stop();
          }
        }
      }, _callee5);
    }));

    return function (_x9, _x10) {
      return _ref5.apply(this, arguments);
    };
  }();

  return controller;
});

function _getControllers () {
  return {
    Auth: Auth.apply(void 0, arguments),
    User: User$1.apply(void 0, arguments)
  };
}

var Transporter = (function (ctx) {
  if (!ctx.log) throw '!log';
  var transporter = nodemailer.createTransport(smtpTransport(ctx.config.nodemailer));
  return transporter;
});

function _getUtils () {
  return {
    Transporter: Transporter.apply(void 0, arguments)
  };
}

var getAuth = (function (ctx) {
  if (!_.has(ctx, 'controllers.Auth.signup')) throw '!controllers.Auth.signup';
  if (!_.has(ctx, 'controllers.Auth.signin')) throw '!controllers.Auth.signin';
  if (!_.has(ctx, 'controllers.Auth.validate')) throw '!controllers.Auth.validate';
  if (!_.has(ctx, 'controllers.Auth.forgot')) throw '!controllers.Auth.forgot';
  if (!_.has(ctx, 'controllers.Auth.checkForgotToken')) throw '!controllers.Auth.checkForgotToken';
  if (!_.has(ctx, 'controllers.Auth.reset')) throw '!controllers.Auth.reset';
  var api = expressAsyncRouter.AsyncRouter();
  api.all('/validate', ctx.controllers.Auth.validate);
  api.post('/signup', ctx.controllers.Auth.signup);
  api.post('/signin', ctx.controllers.Auth.signin);
  api.post('/forgot', ctx.controllers.Auth.forgot);
  api.get('/forgot/:forgotEmailToken', ctx.controllers.Auth.checkForgotToken);
  api.post('/reset', ctx.controllers.Auth.reset);
  return api;
});

var getUser = (function (ctx) {
  if (!_.has(ctx, 'controllers.User.get')) throw '!controllers.User.get';
  if (!_.has(ctx, 'controllers.User.getWorks')) throw '!controllers.User.getWorks';
  if (!_.has(ctx, 'controllers.User.addWork')) throw '!controllers.User.addWork';
  if (!_.has(ctx, 'controllers.User.getPosts')) throw '!controllers.User.getPosts';
  if (!_.has(ctx, 'controllers.User.addPost')) throw '!controllers.User.addPost';
  var api = expressAsyncRouter.AsyncRouter();
  api.get('/', ctx.controllers.User.get);
  api.get('/:id/works', ctx.controllers.User.getWorks);
  api.post('/:id/works', ctx.controllers.User.addWork);
  api.get('/:id/posts', ctx.controllers.User.getPosts);
  api.post('/:id/posts', ctx.controllers.User.addPost);
  return api;
});

var getApi = (function (ctx) {
  var api = expressAsyncRouter.AsyncRouter();
  api.all('/', function () {
    return {
      ok: true,
      version: '1.0.0'
    };
  });
  api.use('/auth', getAuth(ctx));
  api.use('/users', jwt$1({
    secret: ctx.config.jwt.secret
  }), getUser(ctx)); // api.use('/', (err, req, res, next) => {
  //   console.log(err);
  // 	return res.status(401).json([{ flag: false, message: 'Не авторизован' }])
  // })

  return api;
});

var App =
/*#__PURE__*/
function () {
  function App() {
    var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, App);

    Object.assign(this, params);
    if (!this.log) this.log = this.getLogger();
    this.init();
  }

  _createClass(App, [{
    key: "getLogger",
    value: function getLogger(params) {
      return bunyan.createLogger(Object.assign({
        name: 'app',
        src: __DEV__,
        level: 'trace'
      }, params));
    }
  }, {
    key: "getMiddlewares",
    value: function getMiddlewares() {
      return _getMiddlewares(this);
    }
  }, {
    key: "getModels",
    value: function getModels() {
      return _getModels(this);
    }
  }, {
    key: "getDatabase",
    value: function getDatabase() {
      var _this = this;

      return {
        run: function run() {
          new Promise(function (resolve) {
            mongoose.connect(_this.config.db.url, {
              useNewUrlParser: true
            });
            resolve();
          });
        }
      };
    }
  }, {
    key: "getControllers",
    value: function getControllers() {
      return _getControllers(this);
    }
  }, {
    key: "getUtils",
    value: function getUtils() {
      return _getUtils(this);
    }
  }, {
    key: "init",
    value: function init() {
      this.log.trace('App init');
      this.app = express();
      this.db = this.getDatabase();
      this.utils = this.getUtils();
      this.log.trace('utils', Object.keys(this.utils));
      this.middlewares = this.getMiddlewares();
      this.log.trace('middlewares', Object.keys(this.middlewares));
      this.models = this.getModels();
      this.log.trace('models', Object.keys(this.models));
      this.controllers = this.getControllers();
      this.log.trace('controllers', Object.keys(this.controllers));
      this.useMiddlewares();
      this.useRoutes();
      this.useDefaultRoute();
    }
  }, {
    key: "useMiddlewares",
    value: function useMiddlewares() {
      this.app.use(this.middlewares.catchError);
      this.app.use(this.middlewares.reqLog);
      this.app.use(this.middlewares.accessLogger);
      this.app.use(this.middlewares.reqParser);
      this.app.use(this.controllers.Auth.parseToken);
      this.app.use(this.controllers.Auth.parseUser);
    }
  }, {
    key: "useRoutes",
    value: function useRoutes() {
      var api = getApi(this);
      this.app.use('/api/v1', api);
    }
  }, {
    key: "useDefaultRoute",
    value: function useDefaultRoute() {
      this.app.use(function (req, res, next) {
        var err = 'Route not found';
        next(err);
      });
    }
  }, {
    key: "run",
    value: function () {
      var _run = _asyncToGenerator(
      /*#__PURE__*/
      _regeneratorRuntime.mark(function _callee() {
        var _this2 = this;

        return _regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                this.log.trace('App run');
                _context.prev = 1;
                _context.next = 4;
                return this.db.run();

              case 4:
                _context.next = 9;
                break;

              case 6:
                _context.prev = 6;
                _context.t0 = _context["catch"](1);
                this.log.fatal(_context.t0);

              case 9:
                return _context.abrupt("return", new Promise(function (resolve) {
                  _this2.app.listen(_this2.config.port, function () {
                    _this2.log.info("App \"".concat(_this2.config.name, "\" running on port ").concat(_this2.config.port, "!"));

                    resolve(_this2);
                  });
                }));

              case 10:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this, [[1, 6]]);
      }));

      function run() {
        return _run.apply(this, arguments);
      }

      return run;
    }()
  }]);

  return App;
}();

var app = new App({
  config: config
});
app.run();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbIi4uL3NyYy9jb25maWcvaW5kZXguanMiLCIuLi9zcmMvbWlkZGxld2FyZXMvYWNjZXNzTG9nZ2VyLmpzIiwiLi4vc3JjL21pZGRsZXdhcmVzL3JlcVBhcnNlci5qcyIsIi4uL3NyYy9taWRkbGV3YXJlcy9jYXRjaEVycm9yLmpzIiwiLi4vc3JjL21pZGRsZXdhcmVzL3JlcUxvZy5qcyIsIi4uL3NyYy9taWRkbGV3YXJlcy9leHRlbmRSZXFSZXMuanMiLCIuLi9zcmMvbWlkZGxld2FyZXMvaW5kZXguanMiLCIuLi9zcmMvbW9kZWxzL1VzZXIvV29ya1NjaGVtYS5qcyIsIi4uL3NyYy9tb2RlbHMvVXNlci9Qb3N0U2NoZW1hLmpzIiwiLi4vc3JjL21vZGVscy9Vc2VyL1NraWxsU2NoZW1hLmpzIiwiLi4vc3JjL21vZGVscy9Vc2VyL0dyb3Vwc1NraWxscy5qcyIsIi4uL3NyYy9tb2RlbHMvVXNlci9Vc2VyLmpzIiwiLi4vc3JjL21vZGVscy9pbmRleC5qcyIsIi4uL3NyYy9jb250cm9sbGVycy9BdXRoL2luZGV4LmpzIiwiLi4vc3JjL2NvbnRyb2xsZXJzL1VzZXIvaW5kZXguanMiLCIuLi9zcmMvY29udHJvbGxlcnMvaW5kZXguanMiLCIuLi9zcmMvdXRpbHMvTm9kZW1haWxlci9pbmRleC5qcyIsIi4uL3NyYy91dGlscy9pbmRleC5qcyIsIi4uL3NyYy9hcGkvYXV0aC9pbmRleC5qcyIsIi4uL3NyYy9hcGkvdXNlci9pbmRleC5qcyIsIi4uL3NyYy9hcGkvYXBpLmpzIiwiLi4vc3JjL0FwcC5qcyIsIi4uL3NyYy9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJnbG9iYWwuX19ERVZfXyA9IGZhbHNlO1xuLy8gX19TVEFHRV9fXG5nbG9iYWwuX19QUk9EX18gPSB0cnVlO1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIG5hbWU6ICdZb3VyIHN1cGVyIGFwcCcsXG4gIHBvcnQ6IDMwMDEsXG4gIGRiOiB7XG4gICAgdXJsOiAnbW9uZ29kYjovL2xvY2FsaG9zdC90ZXN0JyxcbiAgfSxcbiAgand0OiB7XG4gICAgc2VjcmV0OiAnWU9VUl9TRUNSRVQnLFxuICB9LFxuICBub2RlbWFpbGVyOiB7XG4gICAgc2VydmljZTogJ21haWwnLFxuICAgIGhvc3Q6ICdzbXRwLm1haWwucnUnLFxuICAgIGF1dGg6IHtcbiAgICAgIHVzZXI6ICdtb2xvZG95cnVzdGlrQG1haWwucnUnLFxuICAgICAgcGFzczogJ21vbG9kb3knXG4gICAgfVxuICB9LFxufTtcbiIsImltcG9ydCBsZWZ0UGFkIGZyb20gJ2xlZnQtcGFkJztcblxuZnVuY3Rpb24gbGV2ZWxGbihkYXRhKSB7XG4gIGlmIChkYXRhLmVyciB8fCBkYXRhLnN0YXR1cyA+PSA1MDAgfHwgZGF0YS5kdXJhdGlvbiA+IDEwMDAwKSB7IC8vIHNlcnZlciBpbnRlcm5hbCBlcnJvciBvciBlcnJvclxuICAgIHJldHVybiAnZXJyb3InO1xuICB9IGVsc2UgaWYgKGRhdGEuc3RhdHVzID49IDQwMCB8fCBkYXRhLmR1cmF0aW9uID4gMzAwMCkgeyAvLyBjbGllbnQgZXJyb3JcbiAgICByZXR1cm4gJ3dhcm4nO1xuICB9XG4gIHJldHVybiAnaW5mbyc7XG59XG5cbmZ1bmN0aW9uIGxvZ1N0YXJ0KGRhdGEpIHtcbiAgcmV0dXJuIGAke2xlZnRQYWQoZGF0YS5tZXRob2QsIDQpfSAke2RhdGEudXJsfSBzdGFydGVkIHJlcUlkPSR7ZGF0YS5yZXFJZH1gO1xufVxuXG5mdW5jdGlvbiBsb2dGaW5pc2goZGF0YSkge1xuICBjb25zdCB0aW1lID0gKGRhdGEuZHVyYXRpb24gfHwgMCkudG9GaXhlZCgzKTtcbiAgY29uc3QgbGVuZ3RoID0gZGF0YS5sZW5ndGggfHwgMDtcbiAgcmV0dXJuIGAke2xlZnRQYWQoZGF0YS5tZXRob2QsIDQpfSAke2RhdGEudXJsfSAke2xlZnRQYWQoZGF0YS5zdGF0dXMsIDMpfSAke2xlZnRQYWQodGltZSwgNyl9bXMgJHtsZWZ0UGFkKGxlbmd0aCwgNSl9YiByZXFJZD0ke2RhdGEucmVxSWR9YDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgKHBhcmFtcykgPT4gKFtcbiAgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgY29uc3QgZGF0YSA9IHt9XG4gICAgaWYgKCFyZXEubG9nKSB0aHJvdyAnaGFzIG5vIHJlcS5sb2chJ1xuICAgIGNvbnN0IGxvZyA9IHJlcS5sb2cuY2hpbGQoe1xuICAgICAgY29tcG9uZW50OiAncmVxJyxcbiAgICB9KTtcblxuICAgIGRhdGEucmVxSWQgPSByZXEucmVxSWRcbiAgICBkYXRhLm1ldGhvZCA9IHJlcS5tZXRob2RcbiAgICBpZiAocmVxLndzKSBkYXRhLm1ldGhvZCA9ICdXUydcbiAgICBkYXRhLmhvc3QgPSByZXEuaGVhZGVycy5ob3N0XG4gICAgZGF0YS51cmwgPSAocmVxLmJhc2VVcmwgfHwgJycpICsgKHJlcS51cmwgfHwgJy0nKVxuICAgIGRhdGEucmVmZXJlciA9IHJlcS5oZWFkZXIoJ3JlZmVyZXInKSB8fCByZXEuaGVhZGVyKCdyZWZlcnJlcicpXG4gICAgZGF0YS5pcCA9IHJlcS5pcCB8fCByZXEuY29ubmVjdGlvbi5yZW1vdGVBZGRyZXNzIHx8XG4gICAgICAgIChyZXEuc29ja2V0ICYmIHJlcS5zb2NrZXQucmVtb3RlQWRkcmVzcykgfHxcbiAgICAgICAgKHJlcS5zb2NrZXQuc29ja2V0ICYmIHJlcS5zb2NrZXQuc29ja2V0LnJlbW90ZUFkZHJlc3MpIHx8XG4gICAgICAgICcxMjcuMC4wLjEnXG5cblxuICAgIGlmIChfX0RFVl9fKSB7XG4gICAgICBsb2cuZGVidWcoZGF0YSwgbG9nU3RhcnQoZGF0YSkpO1xuICAgICAgaWYgKHJlcS5ib2R5KSB7XG4gICAgICAgIGxvZy50cmFjZShKU09OLnN0cmluZ2lmeShyZXEuYm9keSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGhydGltZSA9IHByb2Nlc3MuaHJ0aW1lKCk7XG4gICAgZnVuY3Rpb24gbG9nZ2luZygpIHtcbiAgICAgIGRhdGEuc3RhdHVzID0gcmVzLnN0YXR1c0NvZGVcbiAgICAgIGRhdGEubGVuZ3RoID0gcmVzLmdldEhlYWRlcignQ29udGVudC1MZW5ndGgnKVxuXG4gICAgICBjb25zdCBkaWZmID0gcHJvY2Vzcy5ocnRpbWUoaHJ0aW1lKTtcbiAgICAgIGRhdGEuZHVyYXRpb24gPSBkaWZmWzBdICogMWUzICsgZGlmZlsxXSAqIDFlLTZcblxuICAgICAgbG9nW2xldmVsRm4oZGF0YSldKGRhdGEsIGxvZ0ZpbmlzaChkYXRhKSk7XG4gICAgfVxuICAgIHJlcy5vbignZmluaXNoJywgbG9nZ2luZyk7XG4gICAgcmVzLm9uKCdjbG9zZScsIGxvZ2dpbmcpO1xuICAgIG5leHQoKTtcbiAgfVxuXSlcbiIsImltcG9ydCBjb29raWVQYXJzZXIgZnJvbSAnY29va2llLXBhcnNlcidcbmltcG9ydCBib2R5UGFyc2VyIGZyb20gJ2JvZHktcGFyc2VyJ1xuaW1wb3J0IGNvcnMgZnJvbSAnY29ycydcblxuZXhwb3J0IGRlZmF1bHQgKGN0eCkgPT4gKFtcbiAgYm9keVBhcnNlci5qc29uKCksXG4gIGJvZHlQYXJzZXIudXJsZW5jb2RlZCh7IGV4dGVuZGVkOiB0cnVlIH0pLFxuICBjb29raWVQYXJzZXIoKSxcbiAgY29ycygpLFxuXSlcbiIsImV4cG9ydCBkZWZhdWx0IChjdHgpID0+IChcbiAgKGVyciwgcmVxLCByZXMsIG5leHQpID0+IHtcbiAgICBpZihyZXEgJiYgcmVxLmxvZyAmJiByZXEubG9nLmVycm9yKXtcbiAgICAgIHJlcS5sb2cuZXJyb3Ioe1xuICAgICAgICBlcnIsXG4gICAgICAgIHF1ZXJ5OiByZXEucXVlcnksXG4gICAgICAgIGJvZHk6IHJlcS5ib2R5LFxuICAgICAgICBoZWFkZXJzOiByZXEuaGVhZGVyc1xuICAgICAgfSwgKGVyciB8fCB7fSkuc3RhY2spXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUubG9nKGVycilcbiAgICB9XG4gICAgcmVzLnN0YXR1cyhlcnIuc3RhdHVzIHx8IDUwMClcbiAgICByZXR1cm4gcmVzLmpzb24oW10pO1xuICAgIGlmIChyZXMuZXJyKSByZXR1cm4gcmVzLmVycihlcnIpXG4gICAgcmV0dXJuIHJlcy5qc29uKGVycilcbiAgfVxuKVxuIiwiaW1wb3J0IHV1aWQgZnJvbSAndXVpZCdcblxuZXhwb3J0IGRlZmF1bHQgKHBhcmFtcykgPT4gKFtcbiAgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgaWYgKF9fUFJPRF9fKSB7XG4gICAgICByZXEucmVxSWQgPSB1dWlkLnY0KClcbiAgICB9IGVsc2Uge1xuICAgICAgZ2xvYmFsLnJlcUlkID0gMSArIChnbG9iYWwucmVxSWQgfHwgMClcbiAgICAgIHJlcS5yZXFJZCA9IGdsb2JhbC5yZXFJZFxuICAgIH1cbiAgICBpZiAocGFyYW1zLmxvZykge1xuICAgICAgcmVxLmxvZyA9IHBhcmFtcy5sb2cuY2hpbGQoe1xuICAgICAgICByZXFJZDogcmVxLnJlcUlkLFxuICAgICAgfSk7XG4gICAgfVxuICAgIG5leHQoKVxuICB9LFxuXSlcbiIsImltcG9ydCBfIGZyb20gJ2xvZGFzaCdcbmV4cG9ydCBkZWZhdWx0IChjdHgpID0+IChbXG4gIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIGlmIChjdHgucmVxdWVzdHMpIHtcbiAgICAgIF8uZm9yRWFjaChjdHgucmVxdWVzdHMsICh2YWwsIGtleSkgPT4ge1xuICAgICAgICByZXFba2V5XSA9IHZhbC5iaW5kKHJlcSlcbiAgICAgIH0pXG4gICAgICAvLyBpZiAocmVxLmFsbFBhcmFtcykge1xuICAgICAgLy8gICByZXEucGFyYW1zID0gcmVxLmFsbFBhcmFtcy5iaW5kKHJlcSkoKVxuICAgICAgLy8gfVxuICAgIH1cbiAgICBpZiAoY3R4LnJlc3BvbnNlcykge1xuICAgICAgXy5mb3JFYWNoKGN0eC5yZXNwb25zZXMsICh2YWwsIGtleSkgPT4ge1xuICAgICAgICByZXNba2V5XSA9IHZhbC5iaW5kKHJlcylcbiAgICAgIH0pXG4gICAgfVxuICAgIG5leHQoKVxuICB9XG5dKVxuIiwiLy8gZnNcbmltcG9ydCBhY2Nlc3NMb2dnZXIgZnJvbSAnLi9hY2Nlc3NMb2dnZXInXG5pbXBvcnQgcmVxUGFyc2VyIGZyb20gJy4vcmVxUGFyc2VyJ1xuaW1wb3J0IGNhdGNoRXJyb3IgZnJvbSAnLi9jYXRjaEVycm9yJ1xuaW1wb3J0IHJlcUxvZyBmcm9tICcuL3JlcUxvZydcbmltcG9ydCBleHRlbmRSZXFSZXMgZnJvbSAnLi9leHRlbmRSZXFSZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChjdHgpIHtcbiAgcmV0dXJuIHtcbiAgICBhY2Nlc3NMb2dnZXI6IGFjY2Vzc0xvZ2dlciguLi5hcmd1bWVudHMpLFxuICAgIHJlcVBhcnNlcjogcmVxUGFyc2VyKC4uLmFyZ3VtZW50cyksXG4gICAgY2F0Y2hFcnJvcjogY2F0Y2hFcnJvciguLi5hcmd1bWVudHMpLFxuICAgIHJlcUxvZzogcmVxTG9nKC4uLmFyZ3VtZW50cyksXG4gICAgZXh0ZW5kUmVxUmVzOiBleHRlbmRSZXFSZXMoLi4uYXJndW1lbnRzKSxcbiAgfVxufVxuIiwiaW1wb3J0IG1vbmdvb3NlIGZyb20gJ21vbmdvb3NlJ1xuXG5jb25zdCBXb3Jrc1NjaGVtYSA9IG5ldyBtb25nb29zZS5TY2hlbWEoe1xuICBpZDoge1xuICAgIHR5cGU6IFN0cmluZyxcbiAgICB0cmltOiB0cnVlLFxuICB9LFxuICB0aXRsZToge1xuICAgIHR5cGU6IFN0cmluZyxcbiAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICB0cmltOiB0cnVlLFxuICB9LFxuICB0ZWNobm9sb2dpZXM6IHtcbiAgICB0eXBlOiBTdHJpbmcsXG4gICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgdHJpbTogdHJ1ZSxcbiAgfSxcbiAgaW1nVXJsOiB7XG4gICAgdHlwZTogU3RyaW5nLFxuICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgIHRyaW06IHRydWUsXG4gIH0sXG59KVxuXG5cbmV4cG9ydCBkZWZhdWx0IFdvcmtzU2NoZW1hXG4iLCJpbXBvcnQgbW9uZ29vc2UgZnJvbSAnbW9uZ29vc2UnXG5cbmNvbnN0IFBvc3RTY2hlbWEgPSBuZXcgbW9uZ29vc2UuU2NoZW1hKHtcbiAgaWQ6IHtcbiAgICB0eXBlOiBTdHJpbmcsXG4gICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgdHJpbTogdHJ1ZSxcbiAgfSxcbiAgdGl0bGU6IHtcbiAgICB0eXBlOiBTdHJpbmcsXG4gICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgdHJpbTogdHJ1ZSxcbiAgfSxcbiAgZGF0ZToge1xuICAgIHR5cGU6IE51bWJlcixcbiAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICB0cmltOiB0cnVlLFxuICB9LFxuICB0ZXh0OiB7XG4gICAgdHlwZTogU3RyaW5nLFxuICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgIHRyaW06IHRydWUsXG4gIH0sXG59KVxuXG5cbmV4cG9ydCBkZWZhdWx0IFBvc3RTY2hlbWE7XG4iLCJpbXBvcnQgbW9uZ29vc2UgZnJvbSAnbW9uZ29vc2UnXG5cbmNvbnN0IFNraWxsU2NoZW1hID0gbmV3IG1vbmdvb3NlLlNjaGVtYSh7XG4gIGlkOiB7XG4gICAgdHlwZTogU3RyaW5nLFxuICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgIHRyaW06IHRydWUsXG4gIH0sXG4gIGdyb3VwSWQ6IHtcbiAgICB0eXBlOiBTdHJpbmcsXG4gICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgdHJpbTogdHJ1ZSxcbiAgfSxcbiAgdGl0bGU6IHtcbiAgICB0eXBlOiBTdHJpbmcsXG4gICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgdHJpbTogdHJ1ZSxcbiAgfSxcbiAgdmFsdWU6IHtcbiAgICB0eXBlOiBOdW1iZXIsXG4gICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgdHJpbTogdHJ1ZSxcbiAgfSxcbn0pXG5cblxuZXhwb3J0IGRlZmF1bHQgU2tpbGxTY2hlbWE7XG4iLCJpbXBvcnQgbW9uZ29vc2UgZnJvbSAnbW9uZ29vc2UnXG5cbmltcG9ydCBTa2lsbFNjaGVtYSBmcm9tICcuL1NraWxsU2NoZW1hJztcblxuY29uc3QgR3JvdXBzU2tpbGxzID0gbmV3IG1vbmdvb3NlLlNjaGVtYSh7XG4gIGlkOiB7XG4gICAgdHlwZTogU3RyaW5nLFxuICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgIHRyaW06IHRydWUsXG4gIH0sXG4gIHRpdGxlOiB7XG4gICAgdHlwZTogU3RyaW5nLFxuICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgIHRyaW06IHRydWUsXG4gIH0sXG4gIHNraWxsczogW1NraWxsU2NoZW1hXSxcbn0pXG5cblxuZXhwb3J0IGRlZmF1bHQgR3JvdXBzU2tpbGxzO1xuIiwiaW1wb3J0IF8gZnJvbSAnbG9kYXNoJ1xuaW1wb3J0IGp3dCBmcm9tICdqc29ud2VidG9rZW4nXG5pbXBvcnQgYmNyeXB0IGZyb20gJ2JjcnlwdGpzJ1xuaW1wb3J0IFByb21pc2UgZnJvbSAnYmx1ZWJpcmQnXG5jb25zdCBiY3J5cHRHZW5TYWx0ID0gUHJvbWlzZS5wcm9taXNpZnkoYmNyeXB0LmdlblNhbHQpXG5jb25zdCBiY3J5cHRIYXNoID0gUHJvbWlzZS5wcm9taXNpZnkoYmNyeXB0Lmhhc2gpXG5jb25zdCBiY3J5cHRDb21wYXJlID0gUHJvbWlzZS5wcm9taXNpZnkoYmNyeXB0LmNvbXBhcmUpXG5pbXBvcnQgbW9uZ29vc2UgZnJvbSAnbW9uZ29vc2UnXG5cbmltcG9ydCBXb3JrU2NoZW1hIGZyb20gJy4vV29ya1NjaGVtYSc7XG5pbXBvcnQgUG9zdFNjaGVtYSBmcm9tICcuL1Bvc3RTY2hlbWEnO1xuaW1wb3J0IEdyb3Vwc1NraWxscyBmcm9tICcuL0dyb3Vwc1NraWxscyc7XG5cbmV4cG9ydCBkZWZhdWx0IChjdHgpID0+IHtcbiAgaWYgKCFjdHgubG9nKSB0aHJvdyAnIWxvZydcblxuICBjb25zdCBzY2hlbWEgPSBuZXcgbW9uZ29vc2UuU2NoZW1hKHtcbiAgICBlbWFpbDoge1xuICAgICAgdHlwZTogU3RyaW5nLFxuICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICB0cmltOiB0cnVlLFxuICAgIH0sXG4gICAgaWQ6IHtcbiAgICAgIHR5cGU6IFN0cmluZyxcbiAgICAgIHRyaW06IHRydWUsXG4gICAgfSxcbiAgICBwYXNzd29yZDoge1xuICAgICAgdHlwZTogU3RyaW5nLFxuICAgIH0sXG4gICAgZm9yZ290RW1haWxUb2tlbjoge1xuICAgICAgdHlwZTogU3RyaW5nLFxuICAgICAgdHJpbTogdHJ1ZSxcbiAgICB9LFxuICAgIHdvcmtzOiBbV29ya1NjaGVtYV0sXG4gICAgcG9zdHM6IFtQb3N0U2NoZW1hXSxcbiAgICBncm91cHNTa2lsbHM6IFtHcm91cHNTa2lsbHNdXG5cbiAgfSwge1xuICAgIGNvbGxlY3Rpb246ICd1c2VyJyxcbiAgICB0aW1lc3RhbXBzOiB0cnVlLFxuICB9KVxuXG4gIHNjaGVtYS5zdGF0aWNzLmlzVmFsaWRFbWFpbCA9IGZ1bmN0aW9uIChlbWFpbCkge1xuICAgIGNvbnN0IHJlID0gL14oKFtePD4oKVxcW1xcXVxcXFwuLDs6XFxzQFwiXSsoXFwuW148PigpXFxbXFxdXFxcXC4sOzpcXHNAXCJdKykqKXwoXCIuK1wiKSlAKChcXFtbMC05XXsxLDN9XFwuWzAtOV17MSwzfVxcLlswLTldezEsM31cXC5bMC05XXsxLDN9XSl8KChbYS16QS1aXFwtMC05XStcXC4pK1thLXpBLVpdezIsfSkpJC87XG4gICAgcmV0dXJuIHJlLnRlc3QoZW1haWwpXG4gIH1cbiAgc2NoZW1hLnN0YXRpY3MuZ2VuZXJhdGVQYXNzd29yZCA9IGZ1bmN0aW9uIChsZW5ndGggPSAxMCkge1xuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgbGVuZ3RoKVxuICB9XG4gIHNjaGVtYS5tZXRob2RzLnRvSlNPTiA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gXy5vbWl0KHRoaXMudG9PYmplY3QoKSwgWydwYXNzd29yZCddKVxuICB9XG4gIHNjaGVtYS5tZXRob2RzLmdldElkZW50aXR5ID0gZnVuY3Rpb24gKHBhcmFtcykge1xuICAgIGNvbnN0IG9iamVjdCA9IF8ucGljayh0aGlzLnRvT2JqZWN0KCksIFsnX2lkJywgJ2VtYWlsJywgJ2lkJ10pXG4gICAgaWYgKCFwYXJhbXMpIHJldHVybiBvYmplY3RcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihvYmplY3QsIHBhcmFtcylcbiAgfVxuICBzY2hlbWEubWV0aG9kcy5nZW5lcmF0ZUF1dGhUb2tlbiA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICByZXR1cm4gand0LnNpZ24odGhpcy5nZXRJZGVudGl0eShwYXJhbXMpLCBjdHguY29uZmlnLmp3dC5zZWNyZXQpXG4gIH1cbiAgc2NoZW1hLm1ldGhvZHMudmVyaWZ5UGFzc3dvcmQgPSBhc3luYyBmdW5jdGlvbiAocGFzc3dvcmQpIHtcbiAgICByZXR1cm4gYXdhaXQgYmNyeXB0Q29tcGFyZShwYXNzd29yZCwgdGhpcy5wYXNzd29yZClcbiAgfVxuXG4gIGNvbnN0IFNBTFRfV09SS19GQUNUT1IgPSAxMFxuICBzY2hlbWEucHJlKCdzYXZlJywgZnVuY3Rpb24gKG5leHQpIHtcbiAgICBpZiAoIXRoaXMuaXNNb2RpZmllZCgncGFzc3dvcmQnKSkgcmV0dXJuIG5leHQoKTtcbiAgICByZXR1cm4gYmNyeXB0R2VuU2FsdChTQUxUX1dPUktfRkFDVE9SKVxuICAgIC50aGVuKHNhbHQgPT4ge1xuICAgICAgYmNyeXB0SGFzaCh0aGlzLnBhc3N3b3JkLCBzYWx0KVxuICAgICAgLnRoZW4oaGFzaCA9PiB7XG4gICAgICAgIHRoaXMucGFzc3dvcmQgPSBoYXNoXG4gICAgICAgIG5leHQoKTtcbiAgICAgIH0pXG4gICAgfSlcbiAgICAuY2F0Y2gobmV4dClcbiAgfSk7XG5cbiAgcmV0dXJuIG1vbmdvb3NlLm1vZGVsKCdVc2VyJywgc2NoZW1hKTtcbn1cbiIsImltcG9ydCBVc2VyIGZyb20gJy4vVXNlci9Vc2VyJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKCkge1xuICByZXR1cm4ge1xuICAgIFVzZXI6IFVzZXIoLi4uYXJndW1lbnRzKSxcbiAgfVxufVxuIiwiaW1wb3J0IGp3dCBmcm9tICdleHByZXNzLWp3dCdcbmltcG9ydCB1bmlxaWQgZnJvbSAndW5pcWlkJztcbmltcG9ydCBjcnlwdG8gZnJvbSAnY3J5cHRvJztcblxuZXhwb3J0IGZ1bmN0aW9uIGNhbm9uaXplKHN0cikge1xuICByZXR1cm4gc3RyLnRvTG93ZXJDYXNlKCkudHJpbSgpXG59XG5cbmV4cG9ydCBkZWZhdWx0IChjdHgpID0+IHtcbiAgY29uc3QgVXNlciA9IGN0eC5tb2RlbHMuVXNlcjtcblxuICBjb25zdCB0cmFuc3BvcnRlciA9IGN0eC51dGlscy5UcmFuc3BvcnRlcjtcblxuICBjb25zdCBjb250cm9sbGVyID0ge31cblxuICBjb250cm9sbGVyLnZhbGlkYXRlID0gYXN5bmMgZnVuY3Rpb24gKHJlcSwgcmVzKSB7XG4gICAgaWYocmVxLnVzZXIpIHtcbiAgICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBVc2VyLmZpbmRPbmUoe2lkOiByZXEudXNlci5pZH0pXG4gICAgICBpZiAoIXVzZXIpIHJldHVybiByZXMuc3RhdHVzKDQwNCkuanNvbihbe3ZhbGlkYXRlOiBmYWxzZSwgbWVzc2FnZTogJ9Cf0L7Qu9GM0LfQvtCy0LDRgtC10LvRjCDQvdC1INC90LDQudC00LXQvSDQsiDQsdCw0LfQtSd9XSk7XG4gICAgICByZXR1cm4gW3tcbiAgICAgICAgdmFsaWRhdGU6IHRydWUsXG4gICAgICAgIF9fcGFjazogMSxcbiAgICAgICAgand0OiByZXEudXNlcixcbiAgICAgICAgdXNlcjogdXNlcixcbiAgICAgIH1dXG4gICAgfVxuICAgIHJldHVybiByZXMuc3RhdHVzKDQwNCkuanNvbihbe3ZhbGlkYXRlOiBmYWxzZSwgbWVzc2FnZTogJ9Cf0L7Qu9GM0LfQvtCy0LDRgtC10LvRjCDQvdC1INC90LDQudC00LXQvSDQsiDQsdCw0LfQtSd9XSk7XG4gIH1cblxuICBjb250cm9sbGVyLmdldFVzZXJGaWVsZHMgPSBmdW5jdGlvbiAocmVxKSB7XG4gICAgcmV0dXJuIHJlcS5ib2R5O1xuICB9XG5cbiAgY29udHJvbGxlci52YWxpZGF0aW9uVXNlckZpZWxkcyA9IGZ1bmN0aW9uKHVzZXJGaWVsZHMsIHJlcykge1xuICAgIGxldCB2YWxpZCA9IHtcbiAgICAgIGlzVmFsaWQ6IGZhbHNlLFxuICAgICAgbWVzc2FnZTogW11cbiAgICB9XG5cbiAgICBpZighdXNlckZpZWxkcy5jYXB0Y2hhKSB7XG4gICAgICB2YWxpZC5pc1ZhbGlkID0gdHJ1ZTtcbiAgICAgIHZhbGlkLm1lc3NhZ2UgPSBbe3NpZ251cDogZmFsc2UsIG1lc3NhZ2U6ICfQn9Cw0YDQsNC80LXRgtGAIGNhcHRjaGEg0L3QtSDQv9C10YDQtdC00LDQvSDQuNC70Lgg0LLQstC10LTQtdC9INC90LXQstC10YDQvdC+J31dXG4gICAgfVxuXG4gICAgaWYoIXVzZXJGaWVsZHMuZW1haWwgfHwgIXVzZXJGaWVsZHMucGFzc3dvcmQpIHtcbiAgICAgIHZhbGlkLmlzVmFsaWQgPSB0cnVlO1xuICAgICAgdmFsaWQubWVzc2FnZSA9IFt7c2lnbnVwOiBmYWxzZSwgbWVzc2FnZTogJ9Cf0LDRgNCw0LzQtdGC0YBzIGVtYWlsINC40LvQuCBwYXNzd29yZCDQvdC1INC/0LXRgNC10LTQsNC9J31dXG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbGlkO1xuICB9XG5cbiAgY29udHJvbGxlci5nZXRVc2VyQ3JpdGVyaWEgPSBmdW5jdGlvbiAocmVxLCByZXMpIHtcbiAgICBjb25zdCBwYXJhbXMgPSByZXEuYm9keVxuICAgIGlmIChwYXJhbXMuZW1haWwpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGVtYWlsOiBwYXJhbXMuZW1haWwsXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbihbe3NpZ251cDogZmFsc2UsIG1lc3NhZ2U6ICfQn9Cw0YDQsNC80LXRgtGAIGVtYWlsINC90LUg0L/QtdGA0LXQtNCw0L0nfV0pO1xuICB9XG5cbiAgY29udHJvbGxlci5zaWdudXAgPSBhc3luYyBmdW5jdGlvbiAocmVxLCByZXMpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgdXNlckZpZWxkcyA9IGNvbnRyb2xsZXIuZ2V0VXNlckZpZWxkcyhyZXEsIHJlcyk7XG4gICAgICBjb25zdCB2YWxpZCA9IGNvbnRyb2xsZXIudmFsaWRhdGlvblVzZXJGaWVsZHModXNlckZpZWxkcywgcmVzKTtcbiAgICAgIGlmICh2YWxpZC5pc1ZhbGlkKSB7XG4gICAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbih2YWxpZC5tZXNzYWdlKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGNyaXRlcmlhID0gY29udHJvbGxlci5nZXRVc2VyQ3JpdGVyaWEocmVxLCByZXMpO1xuXG4gICAgICBjb25zdCBleGlzdFVzZXIgPSBhd2FpdCBVc2VyLmZpbmRPbmUoY3JpdGVyaWEpXG4gICAgICBpZiAoZXhpc3RVc2VyKSByZXR1cm4gcmVzLnN0YXR1cyg0MDApLmpzb24oW3tzaWdudXA6IGZhbHNlLCBtZXNzYWdlOiAn0KLQsNC60L7QuSBlbWFpbCDQt9Cw0YDQtdCz0LjRgdGC0YDQuNGA0L7QstCw0L0nfV0pO1xuXG4gICAgICBjb25zdCB1c2VyID0gbmV3IFVzZXIoe1xuICAgICAgICAuLi51c2VyRmllbGRzLFxuICAgICAgICBpZDogdW5pcWlkKCksXG4gICAgICAgIGZvcmdvdEVtYWlsVG9rZW46ICcnLFxuICAgICAgfSk7XG5cbiAgICAgIGF3YWl0IHVzZXIuc2F2ZSgpXG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IFt7XG4gICAgICAgIHNpZ251cDogdHJ1ZSxcbiAgICAgICAgdXNlcixcbiAgICAgICAgdG9rZW46IHVzZXIuZ2VuZXJhdGVBdXRoVG9rZW4oKSxcbiAgICAgIH1dXG5cbiAgICAgIHJldHVybiByZXMuanNvbihyZXN1bHQpXG5cbiAgICB9IGNhdGNoKGVycikge1xuICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgIHJldHVybiByZXMuc3RhdHVzKDUwMCkuanNvbihlcnIpXG4gICAgfVxuICB9XG5cbiAgY29udHJvbGxlci5zaWduaW4gPSBhc3luYyBmdW5jdGlvbiAocmVxLCByZXMpIHtcbiAgICBjb25zdCBwYXJhbXMgPSBjb250cm9sbGVyLmdldFVzZXJGaWVsZHMocmVxLCByZXMpO1xuICAgIGlmICghcGFyYW1zLnBhc3N3b3JkKSByZXR1cm4gcmVzLnN0YXR1cyg0MDApLmpzb24oW3tsb2dpbjogZmFsc2UsIG1lc3NhZ2U6ICfQn9Cw0YDQsNC80LXRgtGAIHBhc3N3b3JkINC90LUg0L/QtdGA0LXQtNCw0L0nfV0pO1xuXG4gICAgY29uc3QgY3JpdGVyaWEgPSBjb250cm9sbGVyLmdldFVzZXJDcml0ZXJpYShyZXEpO1xuICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBVc2VyLmZpbmRPbmUoY3JpdGVyaWEpO1xuXG4gICAgaWYgKCF1c2VyKSByZXR1cm4gcmVzLnN0YXR1cyg0MDQpLmpzb24oW3tsb2dpbjogZmFsc2UsIG1lc3NhZ2U6ICfQotCw0LrQvtC5INC/0L7Qu9GM0LfQvtCy0LDRgtC10LvRjCDQvdC1INC90LDQudC00LXQvSd9XSk7XG4gICAgYXdhaXQgdXNlci5zYXZlKCk7XG5cbiAgICBpZiAoIWF3YWl0IHVzZXIudmVyaWZ5UGFzc3dvcmQocGFyYW1zLnBhc3N3b3JkKSkge1xuICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKFt7bG9naW46IGZhbHNlLCBtZXNzYWdlOiAn0J/QtdGA0LXQtNCw0L3QvdGL0Lkg0L/QsNGA0L7Qu9GMINC90LUg0L/QvtC00YXQvtC00LjRgid9XSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcy5qc29uKFt7XG4gICAgICBfX3BhY2s6IDEsXG4gICAgICBsb2dpbjogdHJ1ZSxcbiAgICAgIHVzZXIsXG4gICAgICB0b2tlbjogdXNlci5nZW5lcmF0ZUF1dGhUb2tlbigpLFxuICAgIH1dKVxuICB9XG5cbiAgY29udHJvbGxlci5mb3Jnb3QgPSBhc3luYyBmdW5jdGlvbiAocmVxLCByZXMpIHtcbiAgICBjb25zdCBwYXJhbXMgPSBjb250cm9sbGVyLmdldFVzZXJGaWVsZHMocmVxLCByZXMpO1xuXG4gICAgaWYgKCFwYXJhbXMuZW1haWwpIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbihbeyBmb3Jnb3Q6IGZhbHNlLCBtZXNzYWdlOiAn0J/QsNGA0LDQvNC10YLRgCBlbWFpbCDQvdC1INC/0LXRgNC10LTQsNC9JyB9XSk7XG5cbiAgICBjb25zdCBjcml0ZXJpYSA9IGNvbnRyb2xsZXIuZ2V0VXNlckNyaXRlcmlhKHJlcSk7XG4gICAgY29uc3QgdXNlciA9IGF3YWl0IFVzZXIuZmluZE9uZShjcml0ZXJpYSk7XG5cbiAgICBpZiAoIXVzZXIpIHJldHVybiByZXMuc3RhdHVzKDQwNCkuanNvbihbe2xvZ2luOiBmYWxzZSwgbWVzc2FnZTogJ9Cf0L7Qu9GM0LfQvtCy0LDRgtC10LvRjCDRgSDRgtCw0LrQuNC8IGVtYWlsINC90LUg0L3QsNC50LTQtdC9INCyINCx0LDQt9C1J31dKTtcblxuICAgIGNvbnN0IHRva2VuID0gYXdhaXQgY3J5cHRvLnJhbmRvbUJ5dGVzKDMyKTtcblxuICAgIHVzZXIuZm9yZ290RW1haWxUb2tlbiA9IHRva2VuLnRvU3RyaW5nKCdoZXgnKTtcbiAgICBhd2FpdCB1c2VyLnNhdmUoKTtcblxuXG4gICAgbGV0IHNpdGVVcmwgPSAnaHR0cDovL2xvY2FsaG9zdDozMDAwLyc7XG4gICAgaWYgKF9fUFJPRF9fKSB7XG4gICAgICBzaXRlVXJsID0gJ2h0dHA6Ly9hcHAuYXNobGllLmlvLyc7XG4gICAgfVxuXG4gICAgbGV0IG1haWxUZXh0ID0gYNCf0LXRgNC10LnQtNC40YLQtSDQv9C+INGB0YHRi9C70LrQtSDRh9GC0L7QsdGLINC40LfQvNC10L3QuNGC0Ywg0L/QsNGA0L7Qu9GMICR7c2l0ZVVybH1hdXRoL2ZvcmdvdC8ke3VzZXIuZm9yZ290RW1haWxUb2tlbn1gO1xuXG4gICAgdmFyIG1haWxPcHRpb25zID0ge1xuICAgICAgZnJvbTogJ21vbG9kb3lydXN0aWtAbWFpbC5ydScsXG4gICAgICB0bzogdXNlci5lbWFpbCxcbiAgICAgIHN1YmplY3Q6ICfQktC+0YHRgdGC0LDQvdC+0LLQu9C10L3QuNGPINC/0LDRgNC+0LvRjyDRgdCw0LnRgtCwIEFzaGlsZS5pbycsXG4gICAgICB0ZXh0OiBtYWlsVGV4dFxuICAgIH07XG4gICAgYXdhaXQgdHJhbnNwb3J0ZXIuc2VuZE1haWwobWFpbE9wdGlvbnMpO1xuXG4gICAgY29uc3QgcmVzdWx0ID0gW3tcbiAgICAgIF9fcGFjazogMSxcbiAgICAgIGZvcmdvdDogdHJ1ZVxuICAgIH1dO1xuICAgIHJldHVybiByZXMuanNvbihyZXN1bHQpO1xuICB9XG5cbiAgY29udHJvbGxlci5jaGVja0ZvcmdvdFRva2VuID0gYXN5bmMgZnVuY3Rpb24gKHJlcSwgcmVzKSB7XG4gICAgY29uc3QgeyBmb3Jnb3RFbWFpbFRva2VuIH0gPSByZXEucGFyYW1zO1xuXG4gICAgaWYgKCFmb3Jnb3RFbWFpbFRva2VuKSB7XG4gICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDApLmpzb24oW3tjaGVja0ZvcmdvdFRva2VuOiBmYWxzZSwgbWVzc2FnZTogJ9Ci0L7QutC10L0g0L3QtSDQsdGL0Lsg0L/QtdGA0LXQtNCw0L0nfV0pO1xuICAgIH1cblxuICAgIGNvbnN0IGNyaXRlcmlhID0geyBmb3Jnb3RFbWFpbFRva2VuIH07XG4gICAgY29uc3QgdXNlciA9IGF3YWl0IFVzZXIuZmluZE9uZShjcml0ZXJpYSk7XG5cbiAgICBpZiAoIXVzZXIpIHJldHVybiByZXMuc3RhdHVzKDQwNCkuanNvbihbe2NoZWNrRm9yZ290VG9rZW46IGZhbHNlLCBtZXNzYWdlOiAn0J/QvtC70YzQt9C+0LLQsNGC0LXQu9GMINGBINGC0LDQutC40Lwg0YLQvtC60LXQvdC+0Lwg0L3QtSDQvdCw0LnQtNC10L0nfV0pO1xuXG4gICAgcmV0dXJuIHJlcy5qc29uKFt7XG4gICAgICAgIF9fcGFjazogMSxcbiAgICAgICAgY2hlY2tGb3Jnb3RUb2tlbjogdHJ1ZVxuICAgIH1dKTtcbiAgfVxuXG4gIGNvbnRyb2xsZXIucmVzZXQgPSBhc3luYyBmdW5jdGlvbiAocmVxLCByZXMpIHtcbiAgICBjb25zdCBwYXJhbXMgPSBjb250cm9sbGVyLmdldFVzZXJGaWVsZHMocmVxLCByZXMpO1xuICAgIGNvbnN0IHsgcGFzc3dvcmQsIGNoZWNrUGFzc3dvcmQsIGZvcmdvdEVtYWlsVG9rZW4sIH0gPSBwYXJhbXM7XG5cbiAgICBpZiAoIXBhc3N3b3JkKSByZXR1cm4gcmVzLnN0YXR1cyg0MDApLmpzb24oW3tyZXNldDogZmFsc2UsIG1lc3NhZ2U6ICfQn9Cw0YDQsNC80LXRgtGAIHBhc3N3b3JkINC90LUg0L/QtdGA0LXQtNCw0L0nfV0pO1xuICAgIGlmICghY2hlY2tQYXNzd29yZCkgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKFt7cmVzZXQ6IGZhbHNlLCBtZXNzYWdlOiAn0J/QsNGA0LDQvNC10YLRgCBjaGVja1Bhc3N3b3JkINC90LUg0L/QtdGA0LXQtNCw0L0nfV0pO1xuICAgIGlmIChwYXNzd29yZCAhPT0gY2hlY2tQYXNzd29yZCkgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKFt7cmVzZXQ6IGZhbHNlLCBtZXNzYWdlOiAn0J/QsNGA0L7Qu9C4INC90LUg0YHQvtCy0L/QsNC00LDRjtGCJ31dKTtcbiAgICBpZiAoIWZvcmdvdEVtYWlsVG9rZW4pIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbihbe3Jlc2V0OiBmYWxzZSwgbWVzc2FnZTogJ9Cf0LDRgNCw0LzQtdGC0YAgZm9yZ290RW1haWxUb2tlbiDQvdC1INC/0LXRgNC10LTQsNC9J31dKTtcblxuICAgIGNvbnN0IGNyaXRlcmlhID0geyBmb3Jnb3RFbWFpbFRva2VuIH07XG4gICAgY29uc3QgdXNlciA9IGF3YWl0IFVzZXIuZmluZE9uZShjcml0ZXJpYSk7XG4gICAgaWYgKCF1c2VyKSByZXR1cm4gcmVzLnN0YXR1cyg0MDQpLmpzb24oW3tyZXNldDogZmFsc2UsIG1lc3NhZ2U6ICfQndC1INC60L7RgNGA0LXQutGC0L3Ri9C5INGC0L7QutC10L0nfV0pO1xuICAgIHVzZXIuZm9yZ290RW1haWxUb2tlbiA9ICcnO1xuICAgIHVzZXIucGFzc3dvcmQgPSBwYXNzd29yZDtcblxuICAgIGF3YWl0IHVzZXIuc2F2ZSgpO1xuXG4gICAgcmV0dXJuIHJlcy5qc29uKFt7XG4gICAgICBfX3BhY2s6IDEsXG4gICAgICByZXNldDogdHJ1ZVxuICAgIH1dKVxuICB9XG5cbiAgY29udHJvbGxlci5nZXRUb2tlbiA9IGZ1bmN0aW9uIChyZXEpIHtcbiAgICBpZiAocmVxLmhlYWRlcnMuYXV0aG9yaXphdGlvbiAmJiByZXEuaGVhZGVycy5hdXRob3JpemF0aW9uLnNwbGl0KCAnICcgKVsgMCBdID09PSAnQmVhcmVyJykge1xuICAgICAgcmV0dXJuIHJlcS5oZWFkZXJzLmF1dGhvcml6YXRpb24uc3BsaXQoICcgJyApWyAxIF1cbiAgICB9IGVsc2UgaWYgKHJlcS5oZWFkZXJzWyd4LWFjY2Vzcy10b2tlbiddKSB7XG4gICAgICByZXR1cm4gcmVxLmhlYWRlcnNbJ3gtYWNjZXNzLXRva2VuJ107XG4gICAgfSBlbHNlIGlmICggcmVxLnF1ZXJ5ICYmIHJlcS5xdWVyeS50b2tlbiApIHtcbiAgICAgIHJldHVybiByZXEucXVlcnkudG9rZW5cbiAgICB9IGVsc2UgaWYgKCByZXEuY29va2llcyAmJiByZXEuY29va2llcy50b2tlbiAgKSB7XG4gICAgICByZXR1cm4gcmVxLmNvb2tpZXMudG9rZW5cbiAgICB9XG4gICAgaWYgKF9fREVWX18gJiYgY3R4LmNvbmZpZyAmJiBjdHguY29uZmlnLmp3dCAmJiBjdHguY29uZmlnLmp3dC5kZXZUb2tlbikgcmV0dXJuIGN0eC5jb25maWcuand0LmRldlRva2VuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb250cm9sbGVyLnBhcnNlVG9rZW4gPSBmdW5jdGlvbiAocmVxLCByZXMsIG5leHQpIHtcbiAgICBjb25zdCB0b2tlbiA9IGNvbnRyb2xsZXIuZ2V0VG9rZW4ocmVxKVxuICAgIHJlcS50b2tlbiA9IHRva2VuXG4gICAgbmV4dCgpXG4gIH1cblxuICBjb250cm9sbGVyLnBhcnNlVXNlciA9IGZ1bmN0aW9uIChyZXEsIHJlcywgbmV4dCkge1xuICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICBzZWNyZXQ6IGN0eC5jb25maWcgJiYgY3R4LmNvbmZpZy5qd3Quc2VjcmV0IHx8ICdTRUNSRVQnLFxuICAgICAgZ2V0VG9rZW46IHJlcSA9PiByZXEudG9rZW4sXG4gICAgfVxuICAgIGp3dChvcHRpb25zKShyZXEsIHJlcywgKGVycikgPT4ge1xuICAgICAgaWYgKGVycikgcmVxLl9lcnJKd3QgPSBlcnJcbiAgICAgIG5leHQoKVxuICAgIH0pXG4gIH1cblxuICBjb250cm9sbGVyLmlzQXV0aCA9IGZ1bmN0aW9uIChyZXEsIHJlcywgbmV4dCkge1xuICAgIGlmIChyZXEuX2Vyckp3dCkgcmV0dXJuIG5leHQocmVxLl9lcnJKd3QpXG4gICAgaWYgKCFyZXEudXNlciB8fCAhcmVxLnVzZXIuX2lkKSByZXR1cm4gcmVzLnN0YXR1cyg0MDEpLnNlbmQoJyFyZXEudXNlcicpXG4gICAgbmV4dCgpXG4gIH1cblxuICByZXR1cm4gY29udHJvbGxlclxufVxuIiwiaW1wb3J0IHVuaXFpZCBmcm9tICd1bmlxaWQnO1xuXG5leHBvcnQgZGVmYXVsdCAoY3R4KSA9PiB7XG4gIGNvbnN0IFVzZXIgPSBjdHgubW9kZWxzLlVzZXI7XG5cbiAgbGV0IGNvbnRyb2xsZXIgPSB7fTtcblxuICBjb250cm9sbGVyLmdldCA9IGFzeW5jIGZ1bmN0aW9uKHJlcSwgcmVzKSB7XG4gICAgY29uc3QgdXNlcklEID0gcmVxLnVzZXIuaWQ7XG4gICAgY29uc3QgdXNlciA9IGF3YWl0IFVzZXIuZmluZE9uZSh7aWQ6IHVzZXJJRH0pO1xuXG4gICAgcmV0dXJuIHJlcy5qc29uKHVzZXIpO1xuICB9XG5cbiAgY29udHJvbGxlci5nZXRXb3JrcyA9IGFzeW5jIGZ1bmN0aW9uKHJlcSwgcmVzKSB7XG4gICAgY29uc3QgdXNlcklEID0gcmVxLnBhcmFtcy5pZDtcbiAgICBjb25zdCB1c2VyID0gYXdhaXQgVXNlci5maW5kT25lKHsgaWQ6IHVzZXJJRCB9KTtcblxuICAgIHJldHVybiByZXMuanNvbih1c2VyLndvcmtzKTtcbiAgfVxuXG4gIGNvbnRyb2xsZXIuYWRkV29yayA9IGFzeW5jIGZ1bmN0aW9uKHJlcSwgcmVzKSB7XG4gICAgY29uc3QgcGFyYW1zID0gcmVxLmJvZHlcbiAgICBpZiAoIXBhcmFtcy50aXRsZSkge1xuICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKFt7c2lnbnVwOiBmYWxzZSwgbWVzc2FnZTogJ9CX0LDQv9C+0LvQvdC40YLQtSDQstGB0LUg0L/QvtC70Y8nfV0pO1xuICAgIH1cbiAgICBpZiAoIXBhcmFtcy50ZWNobm9sb2dpZXMpIHtcbiAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbihbe3NpZ251cDogZmFsc2UsIG1lc3NhZ2U6ICfQl9Cw0L/QvtC70L3QuNGC0LUg0LLRgdC1INC/0L7Qu9GPJ31dKTtcbiAgICB9XG4gICAgaWYgKCFwYXJhbXMuaW1nVXJsKSB7XG4gICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDApLmpzb24oW3tzaWdudXA6IGZhbHNlLCBtZXNzYWdlOiAn0JfQsNC/0L7Qu9C90LjRgtC1INCy0YHQtSDQv9C+0LvRjyd9XSk7XG4gICAgfVxuXG4gICAgY29uc3QgeyB0aXRsZSwgdGVjaG5vbG9naWVzLCBpbWdVcmwsIH0gPSBwYXJhbXM7XG5cbiAgICBjb25zdCB1c2VySUQgPSByZXEudXNlci5pZDtcbiAgICBjb25zdCB1c2VyID0gYXdhaXQgVXNlci5maW5kT25lKHtpZDogdXNlcklEfSk7XG5cbiAgICBjb25zdCB3b3JrID0ge1xuICAgICAgaWQ6IHVuaXFpZCgpLFxuICAgICAgdGl0bGUsXG4gICAgICB0ZWNobm9sb2dpZXMsXG4gICAgICBpbWdVcmwsXG4gICAgfVxuXG4gICAgdXNlci53b3Jrcy5wdXNoKHdvcmspO1xuICAgIGF3YWl0IHVzZXIuc2F2ZSgpO1xuXG4gICAgcmV0dXJuIHJlcy5qc29uKFt7IGZsYWc6IHRydWUsIG1lc3NhZ2U6ICfQn9GA0L7QtdC60YIg0YPRgdC/0LXRiNC90L4g0LTQvtCx0LDQstC70LXQvSd9XSk7XG4gIH1cblxuXG4gIGNvbnRyb2xsZXIuZ2V0UG9zdHMgPSBhc3luYyBmdW5jdGlvbihyZXEsIHJlcykge1xuICAgIGNvbnN0IHVzZXJJRCA9IHJlcS5wYXJhbXMuaWQ7XG4gICAgY29uc3QgdXNlciA9IGF3YWl0IFVzZXIuZmluZE9uZSh7IGlkOiB1c2VySUQgfSk7XG5cbiAgICByZXR1cm4gcmVzLmpzb24odXNlci5wb3N0cyk7XG4gIH1cblxuICBjb250cm9sbGVyLmFkZFBvc3QgPSBhc3luYyBmdW5jdGlvbihyZXEsIHJlcykge1xuICAgIGNvbnN0IHBhcmFtcyA9IHJlcS5ib2R5XG4gICAgaWYgKCFwYXJhbXMudGl0bGUpIHtcbiAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbihbe3NpZ251cDogZmFsc2UsIG1lc3NhZ2U6ICfQl9Cw0L/QvtC70L3QuNGC0LUg0LLRgdC1INC/0L7Qu9GPJ31dKTtcbiAgICB9XG4gICAgaWYgKCFwYXJhbXMuZGF0ZSkge1xuICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKFt7c2lnbnVwOiBmYWxzZSwgbWVzc2FnZTogJ9CX0LDQv9C+0LvQvdC40YLQtSDQstGB0LUg0L/QvtC70Y8nfV0pO1xuICAgIH1cbiAgICBpZiAoIXBhcmFtcy50ZXh0KSB7XG4gICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDApLmpzb24oW3tzaWdudXA6IGZhbHNlLCBtZXNzYWdlOiAn0JfQsNC/0L7Qu9C90LjRgtC1INCy0YHQtSDQv9C+0LvRjyd9XSk7XG4gICAgfVxuXG4gICAgY29uc3QgeyB0aXRsZSwgZGF0ZSwgdGV4dCwgfSA9IHBhcmFtcztcblxuICAgIGNvbnN0IHVzZXJJRCA9IHJlcS51c2VyLmlkO1xuICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBVc2VyLmZpbmRPbmUoe2lkOiB1c2VySUR9KTtcblxuICAgIGNvbnN0IHBvc3QgPSB7XG4gICAgICBpZDogdW5pcWlkKCksXG4gICAgICB0aXRsZSxcbiAgICAgIGRhdGUsXG4gICAgICB0ZXh0LFxuICAgIH1cblxuICAgIHVzZXIucG9zdHMucHVzaChwb3N0KTtcbiAgICBhd2FpdCB1c2VyLnNhdmUoKTtcblxuICAgIHJldHVybiByZXMuanNvbihbeyBmbGFnOiB0cnVlLCBtZXNzYWdlOiAn0J/QvtGB0YIg0YPRgdC/0LXRiNC90L4g0LTQvtCx0LDQstC70LXQvSd9XSk7XG4gIH1cblxuXG4gIHJldHVybiBjb250cm9sbGVyXG59XG4iLCJpbXBvcnQgQXV0aCBmcm9tICcuL0F1dGgvaW5kZXgnO1xuaW1wb3J0IFVzZXIgZnJvbSAnLi9Vc2VyL2luZGV4JztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKCkge1xuICByZXR1cm4ge1xuICAgIEF1dGg6IEF1dGgoLi4uYXJndW1lbnRzKSxcbiAgICBVc2VyOiBVc2VyKC4uLmFyZ3VtZW50cyksXG4gIH1cbn1cbiIsImltcG9ydCBub2RlbWFpbGVyIGZyb20gJ25vZGVtYWlsZXInO1xuaW1wb3J0IHNtdHBUcmFuc3BvcnQgZnJvbSAnbm9kZW1haWxlci1zbXRwLXRyYW5zcG9ydCc7XG5cbmV4cG9ydCBkZWZhdWx0IChjdHgpID0+IHtcbiAgaWYgKCFjdHgubG9nKSB0aHJvdyAnIWxvZydcblxuICBjb25zdCB0cmFuc3BvcnRlciA9IG5vZGVtYWlsZXIuY3JlYXRlVHJhbnNwb3J0KHNtdHBUcmFuc3BvcnQoY3R4LmNvbmZpZy5ub2RlbWFpbGVyKSk7XG5cbiAgcmV0dXJuICB0cmFuc3BvcnRlcjtcbn1cbiIsImltcG9ydCBUcmFuc3BvcnRlciBmcm9tICcuL05vZGVtYWlsZXIvaW5kZXgnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB7XG4gICAgVHJhbnNwb3J0ZXI6IFRyYW5zcG9ydGVyKC4uLmFyZ3VtZW50cyksXG4gIH1cbn1cbiIsImltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgeyBBc3luY1JvdXRlciB9IGZyb20gJ2V4cHJlc3MtYXN5bmMtcm91dGVyJztcblxuZXhwb3J0IGRlZmF1bHQgKGN0eCkgPT4ge1xuICBpZiAoIV8uaGFzKGN0eCwgJ2NvbnRyb2xsZXJzLkF1dGguc2lnbnVwJykpIHRocm93ICchY29udHJvbGxlcnMuQXV0aC5zaWdudXAnXG4gIGlmICghXy5oYXMoY3R4LCAnY29udHJvbGxlcnMuQXV0aC5zaWduaW4nKSkgdGhyb3cgJyFjb250cm9sbGVycy5BdXRoLnNpZ25pbidcbiAgaWYgKCFfLmhhcyhjdHgsICdjb250cm9sbGVycy5BdXRoLnZhbGlkYXRlJykpIHRocm93ICchY29udHJvbGxlcnMuQXV0aC52YWxpZGF0ZSdcbiAgaWYgKCFfLmhhcyhjdHgsICdjb250cm9sbGVycy5BdXRoLmZvcmdvdCcpKSB0aHJvdyAnIWNvbnRyb2xsZXJzLkF1dGguZm9yZ290J1xuICBpZiAoIV8uaGFzKGN0eCwgJ2NvbnRyb2xsZXJzLkF1dGguY2hlY2tGb3Jnb3RUb2tlbicpKSB0aHJvdyAnIWNvbnRyb2xsZXJzLkF1dGguY2hlY2tGb3Jnb3RUb2tlbidcbiAgaWYgKCFfLmhhcyhjdHgsICdjb250cm9sbGVycy5BdXRoLnJlc2V0JykpIHRocm93ICchY29udHJvbGxlcnMuQXV0aC5yZXNldCdcblxuXHRjb25zdCBhcGkgPSBBc3luY1JvdXRlcigpO1xuXG4gIGFwaS5hbGwoJy92YWxpZGF0ZScsIGN0eC5jb250cm9sbGVycy5BdXRoLnZhbGlkYXRlKTtcbiAgYXBpLnBvc3QoJy9zaWdudXAnLCBjdHguY29udHJvbGxlcnMuQXV0aC5zaWdudXApO1xuICBhcGkucG9zdCgnL3NpZ25pbicsIGN0eC5jb250cm9sbGVycy5BdXRoLnNpZ25pbik7XG4gIGFwaS5wb3N0KCcvZm9yZ290JywgY3R4LmNvbnRyb2xsZXJzLkF1dGguZm9yZ290KTtcbiAgYXBpLmdldCgnL2ZvcmdvdC86Zm9yZ290RW1haWxUb2tlbicsIGN0eC5jb250cm9sbGVycy5BdXRoLmNoZWNrRm9yZ290VG9rZW4pO1xuICBhcGkucG9zdCgnL3Jlc2V0JywgY3R4LmNvbnRyb2xsZXJzLkF1dGgucmVzZXQpO1xuXG5cdHJldHVybiBhcGk7XG59XG4iLCJpbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuXG5pbXBvcnQgeyBBc3luY1JvdXRlciB9IGZyb20gJ2V4cHJlc3MtYXN5bmMtcm91dGVyJztcblxuZXhwb3J0IGRlZmF1bHQgKGN0eCkgPT4ge1xuICBpZiAoIV8uaGFzKGN0eCwgJ2NvbnRyb2xsZXJzLlVzZXIuZ2V0JykpIHRocm93ICchY29udHJvbGxlcnMuVXNlci5nZXQnXG4gIGlmICghXy5oYXMoY3R4LCAnY29udHJvbGxlcnMuVXNlci5nZXRXb3JrcycpKSB0aHJvdyAnIWNvbnRyb2xsZXJzLlVzZXIuZ2V0V29ya3MnXG4gIGlmICghXy5oYXMoY3R4LCAnY29udHJvbGxlcnMuVXNlci5hZGRXb3JrJykpIHRocm93ICchY29udHJvbGxlcnMuVXNlci5hZGRXb3JrJ1xuICBpZiAoIV8uaGFzKGN0eCwgJ2NvbnRyb2xsZXJzLlVzZXIuZ2V0UG9zdHMnKSkgdGhyb3cgJyFjb250cm9sbGVycy5Vc2VyLmdldFBvc3RzJ1xuICBpZiAoIV8uaGFzKGN0eCwgJ2NvbnRyb2xsZXJzLlVzZXIuYWRkUG9zdCcpKSB0aHJvdyAnIWNvbnRyb2xsZXJzLlVzZXIuYWRkUG9zdCdcblxuXHRjb25zdCBhcGkgPSBBc3luY1JvdXRlcigpO1xuXG4gIGFwaS5nZXQoJy8nLCBjdHguY29udHJvbGxlcnMuVXNlci5nZXQpO1xuICBhcGkuZ2V0KCcvOmlkL3dvcmtzJywgY3R4LmNvbnRyb2xsZXJzLlVzZXIuZ2V0V29ya3MpO1xuICBhcGkucG9zdCgnLzppZC93b3JrcycsIGN0eC5jb250cm9sbGVycy5Vc2VyLmFkZFdvcmspO1xuICBhcGkuZ2V0KCcvOmlkL3Bvc3RzJywgY3R4LmNvbnRyb2xsZXJzLlVzZXIuZ2V0UG9zdHMpO1xuICBhcGkucG9zdCgnLzppZC9wb3N0cycsIGN0eC5jb250cm9sbGVycy5Vc2VyLmFkZFBvc3QpO1xuXG5cdHJldHVybiBhcGk7XG59XG4iLCJpbXBvcnQgeyBBc3luY1JvdXRlciB9IGZyb20gJ2V4cHJlc3MtYXN5bmMtcm91dGVyJztcbmltcG9ydCBleHByZXNzSnd0IGZyb20gJ2V4cHJlc3Mtand0JztcbmltcG9ydCBnZXRBdXRoIGZyb20gJy4vYXV0aC9pbmRleCc7XG5pbXBvcnQgZ2V0VXNlciBmcm9tICcuL3VzZXIvaW5kZXgnO1xuXG5cbmV4cG9ydCBkZWZhdWx0IChjdHgpID0+IHtcblx0Y29uc3QgYXBpID0gQXN5bmNSb3V0ZXIoKTtcblxuICBhcGkuYWxsKCcvJywgKCkgPT4gKHtvazogdHJ1ZSwgdmVyc2lvbjogJzEuMC4wJ30pKVxuXG4gIGFwaS51c2UoJy9hdXRoJywgZ2V0QXV0aChjdHgpKTtcblx0YXBpLnVzZSgnL3VzZXJzJywgZXhwcmVzc0p3dCh7c2VjcmV0OiBjdHguY29uZmlnLmp3dC5zZWNyZXR9KSwgZ2V0VXNlcihjdHgpKTtcblxuXHQvLyBhcGkudXNlKCcvJywgKGVyciwgcmVxLCByZXMsIG5leHQpID0+IHtcbiAgLy8gICBjb25zb2xlLmxvZyhlcnIpO1xuXHQvLyBcdHJldHVybiByZXMuc3RhdHVzKDQwMSkuanNvbihbeyBmbGFnOiBmYWxzZSwgbWVzc2FnZTogJ9Cd0LUg0LDQstGC0L7RgNC40LfQvtCy0LDQvScgfV0pXG5cdC8vIH0pXG5cblx0cmV0dXJuIGFwaTtcbn1cbiIsImltcG9ydCBidW55YW4gZnJvbSAnYnVueWFuJztcbmltcG9ydCBleHByZXNzIGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IG1vbmdvb3NlIGZyb20gJ21vbmdvb3NlJztcblxuaW1wb3J0IGdldE1pZGRsZXdhcmVzIGZyb20gJy4vbWlkZGxld2FyZXMvaW5kZXgnO1xuaW1wb3J0IGdldE1vZGVscyBmcm9tICcuL21vZGVscy9pbmRleCc7XG5pbXBvcnQgZ2V0Q29udHJvbGxlcnMgZnJvbSAnLi9jb250cm9sbGVycy9pbmRleCc7XG5pbXBvcnQgZ2V0VXRpbHMgZnJvbSAnLi91dGlscy9pbmRleCc7XG5pbXBvcnQgZ2V0QXBpIGZyb20gJy4vYXBpL2FwaSc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFwcCB7XG4gIGNvbnN0cnVjdG9yKHBhcmFtcyA9IHt9KSB7XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLCBwYXJhbXMpO1xuICAgIGlmICghdGhpcy5sb2cpIHRoaXMubG9nID0gdGhpcy5nZXRMb2dnZXIoKTtcbiAgICB0aGlzLmluaXQoKTtcbiAgfVxuXG4gIGdldExvZ2dlcihwYXJhbXMpIHtcbiAgICByZXR1cm4gYnVueWFuLmNyZWF0ZUxvZ2dlcihPYmplY3QuYXNzaWduKHtcbiAgICAgIG5hbWU6ICdhcHAnLFxuICAgICAgc3JjOiBfX0RFVl9fLFxuICAgICAgbGV2ZWw6ICd0cmFjZScsXG4gICAgfSwgcGFyYW1zKSlcbiAgfVxuXG4gIGdldE1pZGRsZXdhcmVzKCkge1xuICAgIHJldHVybiBnZXRNaWRkbGV3YXJlcyh0aGlzKTtcbiAgfVxuXG4gIGdldE1vZGVscygpIHtcbiAgICByZXR1cm4gZ2V0TW9kZWxzKHRoaXMpO1xuICB9XG5cbiAgZ2V0RGF0YWJhc2UoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJ1bjogKCkgPT4ge1xuICAgICAgICBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgIG1vbmdvb3NlLmNvbm5lY3QodGhpcy5jb25maWcuZGIudXJsLCB7dXNlTmV3VXJsUGFyc2VyOiB0cnVlfSk7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBnZXRDb250cm9sbGVycygpIHtcbiAgICByZXR1cm4gZ2V0Q29udHJvbGxlcnModGhpcyk7XG4gIH1cblxuICBnZXRVdGlscygpIHtcbiAgICByZXR1cm4gZ2V0VXRpbHModGhpcyk7XG4gIH1cblxuICBpbml0KCkge1xuICAgIHRoaXMubG9nLnRyYWNlKCdBcHAgaW5pdCcpO1xuICAgIHRoaXMuYXBwID0gZXhwcmVzcygpO1xuICAgIHRoaXMuZGIgPSB0aGlzLmdldERhdGFiYXNlKCk7XG5cbiAgICB0aGlzLnV0aWxzID0gdGhpcy5nZXRVdGlscygpO1xuICAgIHRoaXMubG9nLnRyYWNlKCd1dGlscycsIE9iamVjdC5rZXlzKHRoaXMudXRpbHMpKTtcblxuICAgIHRoaXMubWlkZGxld2FyZXMgPSB0aGlzLmdldE1pZGRsZXdhcmVzKCk7XG4gICAgdGhpcy5sb2cudHJhY2UoJ21pZGRsZXdhcmVzJywgT2JqZWN0LmtleXModGhpcy5taWRkbGV3YXJlcykpO1xuXG4gICAgdGhpcy5tb2RlbHMgPSB0aGlzLmdldE1vZGVscygpO1xuICAgIHRoaXMubG9nLnRyYWNlKCdtb2RlbHMnLCBPYmplY3Qua2V5cyh0aGlzLm1vZGVscykpO1xuXG4gICAgdGhpcy5jb250cm9sbGVycyA9IHRoaXMuZ2V0Q29udHJvbGxlcnMoKTtcbiAgICB0aGlzLmxvZy50cmFjZSgnY29udHJvbGxlcnMnLCBPYmplY3Qua2V5cyh0aGlzLmNvbnRyb2xsZXJzKSk7XG5cbiAgICB0aGlzLnVzZU1pZGRsZXdhcmVzKCk7XG4gICAgdGhpcy51c2VSb3V0ZXMoKTtcbiAgICB0aGlzLnVzZURlZmF1bHRSb3V0ZSgpO1xuICB9XG5cbiAgdXNlTWlkZGxld2FyZXMoKSB7XG4gICAgdGhpcy5hcHAudXNlKHRoaXMubWlkZGxld2FyZXMuY2F0Y2hFcnJvcik7XG4gICAgdGhpcy5hcHAudXNlKHRoaXMubWlkZGxld2FyZXMucmVxTG9nKTtcbiAgICB0aGlzLmFwcC51c2UodGhpcy5taWRkbGV3YXJlcy5hY2Nlc3NMb2dnZXIpO1xuICAgIHRoaXMuYXBwLnVzZSh0aGlzLm1pZGRsZXdhcmVzLnJlcVBhcnNlcik7XG5cbiAgICB0aGlzLmFwcC51c2UodGhpcy5jb250cm9sbGVycy5BdXRoLnBhcnNlVG9rZW4pO1xuICAgIHRoaXMuYXBwLnVzZSh0aGlzLmNvbnRyb2xsZXJzLkF1dGgucGFyc2VVc2VyKTtcbiAgfVxuXG4gIHVzZVJvdXRlcygpIHtcbiAgICBjb25zdCBhcGkgPSBnZXRBcGkodGhpcyk7XG4gICAgdGhpcy5hcHAudXNlKCcvYXBpL3YxJywgYXBpKTtcbiAgfVxuXG4gIHVzZURlZmF1bHRSb3V0ZSgpIHtcbiAgICB0aGlzLmFwcC51c2UoKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgICBjb25zdCBlcnIgPSAoJ1JvdXRlIG5vdCBmb3VuZCcpO1xuICAgICAgbmV4dChlcnIpO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgcnVuKCkge1xuICAgIHRoaXMubG9nLnRyYWNlKCdBcHAgcnVuJyk7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuZGIucnVuKCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLmxvZy5mYXRhbChlcnIpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgIHRoaXMuYXBwLmxpc3Rlbih0aGlzLmNvbmZpZy5wb3J0LCAoKSA9PiB7XG4gICAgICAgIHRoaXMubG9nLmluZm8oYEFwcCBcIiR7dGhpcy5jb25maWcubmFtZX1cIiBydW5uaW5nIG9uIHBvcnQgJHt0aGlzLmNvbmZpZy5wb3J0fSFgKTtcbiAgICAgICAgcmVzb2x2ZSh0aGlzKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG59XG4iLCJpbXBvcnQgY29uZmlnIGZyb20gJy4vY29uZmlnL2luZGV4JztcbmltcG9ydCBBcHAgZnJvbSAnLi9BcHAnO1xuXG5jb25zdCBhcHAgPSBuZXcgQXBwKHsgY29uZmlnIH0pO1xuYXBwLnJ1bigpO1xuXG4iXSwibmFtZXMiOlsiZ2xvYmFsIiwiX19ERVZfXyIsIl9fUFJPRF9fIiwibmFtZSIsInBvcnQiLCJkYiIsInVybCIsImp3dCIsInNlY3JldCIsIm5vZGVtYWlsZXIiLCJzZXJ2aWNlIiwiaG9zdCIsImF1dGgiLCJ1c2VyIiwicGFzcyIsImxldmVsRm4iLCJkYXRhIiwiZXJyIiwic3RhdHVzIiwiZHVyYXRpb24iLCJsb2dTdGFydCIsImxlZnRQYWQiLCJtZXRob2QiLCJyZXFJZCIsImxvZ0ZpbmlzaCIsInRpbWUiLCJ0b0ZpeGVkIiwibGVuZ3RoIiwicGFyYW1zIiwicmVxIiwicmVzIiwibmV4dCIsImxvZyIsImNoaWxkIiwiY29tcG9uZW50Iiwid3MiLCJoZWFkZXJzIiwiYmFzZVVybCIsInJlZmVyZXIiLCJoZWFkZXIiLCJpcCIsImNvbm5lY3Rpb24iLCJyZW1vdGVBZGRyZXNzIiwic29ja2V0IiwiZGVidWciLCJib2R5IiwidHJhY2UiLCJKU09OIiwic3RyaW5naWZ5IiwiaHJ0aW1lIiwicHJvY2VzcyIsImxvZ2dpbmciLCJzdGF0dXNDb2RlIiwiZ2V0SGVhZGVyIiwiZGlmZiIsIm9uIiwiY3R4IiwiYm9keVBhcnNlciIsImpzb24iLCJ1cmxlbmNvZGVkIiwiZXh0ZW5kZWQiLCJjb29raWVQYXJzZXIiLCJjb3JzIiwiZXJyb3IiLCJxdWVyeSIsInN0YWNrIiwiY29uc29sZSIsInV1aWQiLCJ2NCIsInJlcXVlc3RzIiwiXyIsImZvckVhY2giLCJ2YWwiLCJrZXkiLCJiaW5kIiwicmVzcG9uc2VzIiwiYWNjZXNzTG9nZ2VyIiwiYXJndW1lbnRzIiwicmVxUGFyc2VyIiwiY2F0Y2hFcnJvciIsInJlcUxvZyIsImV4dGVuZFJlcVJlcyIsIldvcmtzU2NoZW1hIiwibW9uZ29vc2UiLCJTY2hlbWEiLCJpZCIsInR5cGUiLCJTdHJpbmciLCJ0cmltIiwidGl0bGUiLCJyZXF1aXJlZCIsInRlY2hub2xvZ2llcyIsImltZ1VybCIsIlBvc3RTY2hlbWEiLCJkYXRlIiwiTnVtYmVyIiwidGV4dCIsIlNraWxsU2NoZW1hIiwiZ3JvdXBJZCIsInZhbHVlIiwiR3JvdXBzU2tpbGxzIiwic2tpbGxzIiwiYmNyeXB0R2VuU2FsdCIsIlByb21pc2UiLCJwcm9taXNpZnkiLCJiY3J5cHQiLCJnZW5TYWx0IiwiYmNyeXB0SGFzaCIsImhhc2giLCJiY3J5cHRDb21wYXJlIiwiY29tcGFyZSIsInNjaGVtYSIsImVtYWlsIiwicGFzc3dvcmQiLCJmb3Jnb3RFbWFpbFRva2VuIiwid29ya3MiLCJXb3JrU2NoZW1hIiwicG9zdHMiLCJncm91cHNTa2lsbHMiLCJjb2xsZWN0aW9uIiwidGltZXN0YW1wcyIsInN0YXRpY3MiLCJpc1ZhbGlkRW1haWwiLCJyZSIsInRlc3QiLCJnZW5lcmF0ZVBhc3N3b3JkIiwiTWF0aCIsInJhbmRvbSIsInRvU3RyaW5nIiwic3Vic3RyIiwibWV0aG9kcyIsInRvSlNPTiIsIm9taXQiLCJ0b09iamVjdCIsImdldElkZW50aXR5Iiwib2JqZWN0IiwicGljayIsIk9iamVjdCIsImFzc2lnbiIsImdlbmVyYXRlQXV0aFRva2VuIiwic2lnbiIsImNvbmZpZyIsInZlcmlmeVBhc3N3b3JkIiwiU0FMVF9XT1JLX0ZBQ1RPUiIsInByZSIsImlzTW9kaWZpZWQiLCJ0aGVuIiwic2FsdCIsIm1vZGVsIiwiVXNlciIsIm1vZGVscyIsInRyYW5zcG9ydGVyIiwidXRpbHMiLCJUcmFuc3BvcnRlciIsImNvbnRyb2xsZXIiLCJ2YWxpZGF0ZSIsImZpbmRPbmUiLCJtZXNzYWdlIiwiX19wYWNrIiwiZ2V0VXNlckZpZWxkcyIsInZhbGlkYXRpb25Vc2VyRmllbGRzIiwidXNlckZpZWxkcyIsInZhbGlkIiwiaXNWYWxpZCIsImNhcHRjaGEiLCJzaWdudXAiLCJnZXRVc2VyQ3JpdGVyaWEiLCJjcml0ZXJpYSIsImV4aXN0VXNlciIsInVuaXFpZCIsInNhdmUiLCJyZXN1bHQiLCJ0b2tlbiIsInNpZ25pbiIsImxvZ2luIiwiZm9yZ290IiwiY3J5cHRvIiwicmFuZG9tQnl0ZXMiLCJzaXRlVXJsIiwibWFpbFRleHQiLCJtYWlsT3B0aW9ucyIsImZyb20iLCJ0byIsInN1YmplY3QiLCJzZW5kTWFpbCIsImNoZWNrRm9yZ290VG9rZW4iLCJyZXNldCIsImNoZWNrUGFzc3dvcmQiLCJnZXRUb2tlbiIsImF1dGhvcml6YXRpb24iLCJzcGxpdCIsImNvb2tpZXMiLCJkZXZUb2tlbiIsInBhcnNlVG9rZW4iLCJwYXJzZVVzZXIiLCJvcHRpb25zIiwiX2Vyckp3dCIsImlzQXV0aCIsIl9pZCIsInNlbmQiLCJnZXQiLCJ1c2VySUQiLCJnZXRXb3JrcyIsImFkZFdvcmsiLCJ3b3JrIiwicHVzaCIsImZsYWciLCJnZXRQb3N0cyIsImFkZFBvc3QiLCJwb3N0IiwiQXV0aCIsImNyZWF0ZVRyYW5zcG9ydCIsInNtdHBUcmFuc3BvcnQiLCJoYXMiLCJhcGkiLCJBc3luY1JvdXRlciIsImFsbCIsImNvbnRyb2xsZXJzIiwib2siLCJ2ZXJzaW9uIiwidXNlIiwiZ2V0QXV0aCIsImV4cHJlc3NKd3QiLCJnZXRVc2VyIiwiQXBwIiwiZ2V0TG9nZ2VyIiwiaW5pdCIsImJ1bnlhbiIsImNyZWF0ZUxvZ2dlciIsInNyYyIsImxldmVsIiwiZ2V0TWlkZGxld2FyZXMiLCJnZXRNb2RlbHMiLCJydW4iLCJyZXNvbHZlIiwiY29ubmVjdCIsInVzZU5ld1VybFBhcnNlciIsImdldENvbnRyb2xsZXJzIiwiZ2V0VXRpbHMiLCJhcHAiLCJleHByZXNzIiwiZ2V0RGF0YWJhc2UiLCJrZXlzIiwibWlkZGxld2FyZXMiLCJ1c2VNaWRkbGV3YXJlcyIsInVzZVJvdXRlcyIsInVzZURlZmF1bHRSb3V0ZSIsImdldEFwaSIsImZhdGFsIiwibGlzdGVuIiwiaW5mbyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxNQUFNLENBQUNDLE9BQVAsR0FBaUIsS0FBakI7O0FBRUFELE1BQU0sQ0FBQ0UsUUFBUCxHQUFrQixJQUFsQjtBQUVBLGFBQWU7RUFDYkMsSUFBSSxFQUFFLGdCQURPO0VBRWJDLElBQUksRUFBRSxJQUZPO0VBR2JDLEVBQUUsRUFBRTtJQUNGQyxHQUFHLEVBQUU7R0FKTTtFQU1iQyxHQUFHLEVBQUU7SUFDSEMsTUFBTSxFQUFFO0dBUEc7RUFTYkMsVUFBVSxFQUFFO0lBQ1ZDLE9BQU8sRUFBRSxNQURDO0lBRVZDLElBQUksRUFBRSxjQUZJO0lBR1ZDLElBQUksRUFBRTtNQUNKQyxJQUFJLEVBQUUsdUJBREY7TUFFSkMsSUFBSSxFQUFFOzs7Q0FkWjs7QUNGQSxTQUFTQyxPQUFULENBQWlCQyxJQUFqQixFQUF1QjtNQUNqQkEsSUFBSSxDQUFDQyxHQUFMLElBQVlELElBQUksQ0FBQ0UsTUFBTCxJQUFlLEdBQTNCLElBQWtDRixJQUFJLENBQUNHLFFBQUwsR0FBZ0Is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
