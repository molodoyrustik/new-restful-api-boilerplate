(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('@babel/runtime/regenerator'), require('@babel/runtime/helpers/asyncToGenerator'), require('@babel/runtime/helpers/classCallCheck'), require('@babel/runtime/helpers/createClass'), require('bunyan'), require('express'), require('mongoose'), require('left-pad'), require('cookie-parser'), require('body-parser'), require('cors'), require('uuid'), require('lodash'), require('jsonwebtoken'), require('bcryptjs'), require('bluebird'), require('@babel/runtime/helpers/defineProperty'), require('express-jwt'), require('uniqid'), require('crypto'), require('nodemailer'), require('nodemailer-smtp-transport'), require('express-async-router')) :
  typeof define === 'function' && define.amd ? define(['@babel/runtime/regenerator', '@babel/runtime/helpers/asyncToGenerator', '@babel/runtime/helpers/classCallCheck', '@babel/runtime/helpers/createClass', 'bunyan', 'express', 'mongoose', 'left-pad', 'cookie-parser', 'body-parser', 'cors', 'uuid', 'lodash', 'jsonwebtoken', 'bcryptjs', 'bluebird', '@babel/runtime/helpers/defineProperty', 'express-jwt', 'uniqid', 'crypto', 'nodemailer', 'nodemailer-smtp-transport', 'express-async-router'], factory) :
  (global = global || self, factory(global._regeneratorRuntime, global._asyncToGenerator, global._classCallCheck, global._createClass, global.bunyan, global.express, global.mongoose, global.leftPad, global.cookieParser, global.bodyParser, global.cors, global.uuid, global._, global.jwt, global.bcrypt, global.Promise$1, global._defineProperty, global.jwt$1, global.uniqid, global.crypto, global.nodemailer, global.smtpTransport, global.expressAsyncRouter));
}(this, function (_regeneratorRuntime, _asyncToGenerator, _classCallCheck, _createClass, bunyan, express, mongoose, leftPad, cookieParser, bodyParser, cors, uuid, _, jwt, bcrypt, Promise$1, _defineProperty, jwt$1, uniqid, crypto, nodemailer, smtpTransport, expressAsyncRouter) { 'use strict';

  _regeneratorRuntime = _regeneratorRuntime && _regeneratorRuntime.hasOwnProperty('default') ? _regeneratorRuntime['default'] : _regeneratorRuntime;
  _asyncToGenerator = _asyncToGenerator && _asyncToGenerator.hasOwnProperty('default') ? _asyncToGenerator['default'] : _asyncToGenerator;
  _classCallCheck = _classCallCheck && _classCallCheck.hasOwnProperty('default') ? _classCallCheck['default'] : _classCallCheck;
  _createClass = _createClass && _createClass.hasOwnProperty('default') ? _createClass['default'] : _createClass;
  bunyan = bunyan && bunyan.hasOwnProperty('default') ? bunyan['default'] : bunyan;
  express = express && express.hasOwnProperty('default') ? express['default'] : express;
  mongoose = mongoose && mongoose.hasOwnProperty('default') ? mongoose['default'] : mongoose;
  leftPad = leftPad && leftPad.hasOwnProperty('default') ? leftPad['default'] : leftPad;
  cookieParser = cookieParser && cookieParser.hasOwnProperty('default') ? cookieParser['default'] : cookieParser;
  bodyParser = bodyParser && bodyParser.hasOwnProperty('default') ? bodyParser['default'] : bodyParser;
  cors = cors && cors.hasOwnProperty('default') ? cors['default'] : cors;
  uuid = uuid && uuid.hasOwnProperty('default') ? uuid['default'] : uuid;
  _ = _ && _.hasOwnProperty('default') ? _['default'] : _;
  jwt = jwt && jwt.hasOwnProperty('default') ? jwt['default'] : jwt;
  bcrypt = bcrypt && bcrypt.hasOwnProperty('default') ? bcrypt['default'] : bcrypt;
  Promise$1 = Promise$1 && Promise$1.hasOwnProperty('default') ? Promise$1['default'] : Promise$1;
  _defineProperty = _defineProperty && _defineProperty.hasOwnProperty('default') ? _defineProperty['default'] : _defineProperty;
  jwt$1 = jwt$1 && jwt$1.hasOwnProperty('default') ? jwt$1['default'] : jwt$1;
  uniqid = uniqid && uniqid.hasOwnProperty('default') ? uniqid['default'] : uniqid;
  crypto = crypto && crypto.hasOwnProperty('default') ? crypto['default'] : crypto;
  nodemailer = nodemailer && nodemailer.hasOwnProperty('default') ? nodemailer['default'] : nodemailer;
  smtpTransport = smtpTransport && smtpTransport.hasOwnProperty('default') ? smtpTransport['default'] : smtpTransport;

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

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgudW1kLmpzIiwic291cmNlcyI6WyIuLi9zcmMvY29uZmlnL2luZGV4LmpzIiwiLi4vc3JjL21pZGRsZXdhcmVzL2FjY2Vzc0xvZ2dlci5qcyIsIi4uL3NyYy9taWRkbGV3YXJlcy9yZXFQYXJzZXIuanMiLCIuLi9zcmMvbWlkZGxld2FyZXMvY2F0Y2hFcnJvci5qcyIsIi4uL3NyYy9taWRkbGV3YXJlcy9yZXFMb2cuanMiLCIuLi9zcmMvbWlkZGxld2FyZXMvZXh0ZW5kUmVxUmVzLmpzIiwiLi4vc3JjL21pZGRsZXdhcmVzL2luZGV4LmpzIiwiLi4vc3JjL21vZGVscy9Vc2VyL1dvcmtTY2hlbWEuanMiLCIuLi9zcmMvbW9kZWxzL1VzZXIvUG9zdFNjaGVtYS5qcyIsIi4uL3NyYy9tb2RlbHMvVXNlci9Ta2lsbFNjaGVtYS5qcyIsIi4uL3NyYy9tb2RlbHMvVXNlci9Hcm91cHNTa2lsbHMuanMiLCIuLi9zcmMvbW9kZWxzL1VzZXIvVXNlci5qcyIsIi4uL3NyYy9tb2RlbHMvaW5kZXguanMiLCIuLi9zcmMvY29udHJvbGxlcnMvQXV0aC9pbmRleC5qcyIsIi4uL3NyYy9jb250cm9sbGVycy9Vc2VyL2luZGV4LmpzIiwiLi4vc3JjL2NvbnRyb2xsZXJzL2luZGV4LmpzIiwiLi4vc3JjL3V0aWxzL05vZGVtYWlsZXIvaW5kZXguanMiLCIuLi9zcmMvdXRpbHMvaW5kZXguanMiLCIuLi9zcmMvYXBpL2F1dGgvaW5kZXguanMiLCIuLi9zcmMvYXBpL3VzZXIvaW5kZXguanMiLCIuLi9zcmMvYXBpL2FwaS5qcyIsIi4uL3NyYy9BcHAuanMiLCIuLi9zcmMvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiZ2xvYmFsLl9fREVWX18gPSBmYWxzZTtcbi8vIF9fU1RBR0VfX1xuZ2xvYmFsLl9fUFJPRF9fID0gdHJ1ZTtcblxuZXhwb3J0IGRlZmF1bHQge1xuICBuYW1lOiAnWW91ciBzdXBlciBhcHAnLFxuICBwb3J0OiAzMDAxLFxuICBkYjoge1xuICAgIHVybDogJ21vbmdvZGI6Ly9sb2NhbGhvc3QvdGVzdCcsXG4gIH0sXG4gIGp3dDoge1xuICAgIHNlY3JldDogJ1lPVVJfU0VDUkVUJyxcbiAgfSxcbiAgbm9kZW1haWxlcjoge1xuICAgIHNlcnZpY2U6ICdtYWlsJyxcbiAgICBob3N0OiAnc210cC5tYWlsLnJ1JyxcbiAgICBhdXRoOiB7XG4gICAgICB1c2VyOiAnbW9sb2RveXJ1c3Rpa0BtYWlsLnJ1JyxcbiAgICAgIHBhc3M6ICdtb2xvZG95J1xuICAgIH1cbiAgfSxcbn07XG4iLCJpbXBvcnQgbGVmdFBhZCBmcm9tICdsZWZ0LXBhZCc7XG5cbmZ1bmN0aW9uIGxldmVsRm4oZGF0YSkge1xuICBpZiAoZGF0YS5lcnIgfHwgZGF0YS5zdGF0dXMgPj0gNTAwIHx8IGRhdGEuZHVyYXRpb24gPiAxMDAwMCkgeyAvLyBzZXJ2ZXIgaW50ZXJuYWwgZXJyb3Igb3IgZXJyb3JcbiAgICByZXR1cm4gJ2Vycm9yJztcbiAgfSBlbHNlIGlmIChkYXRhLnN0YXR1cyA+PSA0MDAgfHwgZGF0YS5kdXJhdGlvbiA+IDMwMDApIHsgLy8gY2xpZW50IGVycm9yXG4gICAgcmV0dXJuICd3YXJuJztcbiAgfVxuICByZXR1cm4gJ2luZm8nO1xufVxuXG5mdW5jdGlvbiBsb2dTdGFydChkYXRhKSB7XG4gIHJldHVybiBgJHtsZWZ0UGFkKGRhdGEubWV0aG9kLCA0KX0gJHtkYXRhLnVybH0gc3RhcnRlZCByZXFJZD0ke2RhdGEucmVxSWR9YDtcbn1cblxuZnVuY3Rpb24gbG9nRmluaXNoKGRhdGEpIHtcbiAgY29uc3QgdGltZSA9IChkYXRhLmR1cmF0aW9uIHx8IDApLnRvRml4ZWQoMyk7XG4gIGNvbnN0IGxlbmd0aCA9IGRhdGEubGVuZ3RoIHx8IDA7XG4gIHJldHVybiBgJHtsZWZ0UGFkKGRhdGEubWV0aG9kLCA0KX0gJHtkYXRhLnVybH0gJHtsZWZ0UGFkKGRhdGEuc3RhdHVzLCAzKX0gJHtsZWZ0UGFkKHRpbWUsIDcpfW1zICR7bGVmdFBhZChsZW5ndGgsIDUpfWIgcmVxSWQ9JHtkYXRhLnJlcUlkfWA7XG59XG5cbmV4cG9ydCBkZWZhdWx0IChwYXJhbXMpID0+IChbXG4gIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIGNvbnN0IGRhdGEgPSB7fVxuICAgIGlmICghcmVxLmxvZykgdGhyb3cgJ2hhcyBubyByZXEubG9nISdcbiAgICBjb25zdCBsb2cgPSByZXEubG9nLmNoaWxkKHtcbiAgICAgIGNvbXBvbmVudDogJ3JlcScsXG4gICAgfSk7XG5cbiAgICBkYXRhLnJlcUlkID0gcmVxLnJlcUlkXG4gICAgZGF0YS5tZXRob2QgPSByZXEubWV0aG9kXG4gICAgaWYgKHJlcS53cykgZGF0YS5tZXRob2QgPSAnV1MnXG4gICAgZGF0YS5ob3N0ID0gcmVxLmhlYWRlcnMuaG9zdFxuICAgIGRhdGEudXJsID0gKHJlcS5iYXNlVXJsIHx8ICcnKSArIChyZXEudXJsIHx8ICctJylcbiAgICBkYXRhLnJlZmVyZXIgPSByZXEuaGVhZGVyKCdyZWZlcmVyJykgfHwgcmVxLmhlYWRlcigncmVmZXJyZXInKVxuICAgIGRhdGEuaXAgPSByZXEuaXAgfHwgcmVxLmNvbm5lY3Rpb24ucmVtb3RlQWRkcmVzcyB8fFxuICAgICAgICAocmVxLnNvY2tldCAmJiByZXEuc29ja2V0LnJlbW90ZUFkZHJlc3MpIHx8XG4gICAgICAgIChyZXEuc29ja2V0LnNvY2tldCAmJiByZXEuc29ja2V0LnNvY2tldC5yZW1vdGVBZGRyZXNzKSB8fFxuICAgICAgICAnMTI3LjAuMC4xJ1xuXG5cbiAgICBpZiAoX19ERVZfXykge1xuICAgICAgbG9nLmRlYnVnKGRhdGEsIGxvZ1N0YXJ0KGRhdGEpKTtcbiAgICAgIGlmIChyZXEuYm9keSkge1xuICAgICAgICBsb2cudHJhY2UoSlNPTi5zdHJpbmdpZnkocmVxLmJvZHkpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBocnRpbWUgPSBwcm9jZXNzLmhydGltZSgpO1xuICAgIGZ1bmN0aW9uIGxvZ2dpbmcoKSB7XG4gICAgICBkYXRhLnN0YXR1cyA9IHJlcy5zdGF0dXNDb2RlXG4gICAgICBkYXRhLmxlbmd0aCA9IHJlcy5nZXRIZWFkZXIoJ0NvbnRlbnQtTGVuZ3RoJylcblxuICAgICAgY29uc3QgZGlmZiA9IHByb2Nlc3MuaHJ0aW1lKGhydGltZSk7XG4gICAgICBkYXRhLmR1cmF0aW9uID0gZGlmZlswXSAqIDFlMyArIGRpZmZbMV0gKiAxZS02XG5cbiAgICAgIGxvZ1tsZXZlbEZuKGRhdGEpXShkYXRhLCBsb2dGaW5pc2goZGF0YSkpO1xuICAgIH1cbiAgICByZXMub24oJ2ZpbmlzaCcsIGxvZ2dpbmcpO1xuICAgIHJlcy5vbignY2xvc2UnLCBsb2dnaW5nKTtcbiAgICBuZXh0KCk7XG4gIH1cbl0pXG4iLCJpbXBvcnQgY29va2llUGFyc2VyIGZyb20gJ2Nvb2tpZS1wYXJzZXInXG5pbXBvcnQgYm9keVBhcnNlciBmcm9tICdib2R5LXBhcnNlcidcbmltcG9ydCBjb3JzIGZyb20gJ2NvcnMnXG5cbmV4cG9ydCBkZWZhdWx0IChjdHgpID0+IChbXG4gIGJvZHlQYXJzZXIuanNvbigpLFxuICBib2R5UGFyc2VyLnVybGVuY29kZWQoeyBleHRlbmRlZDogdHJ1ZSB9KSxcbiAgY29va2llUGFyc2VyKCksXG4gIGNvcnMoKSxcbl0pXG4iLCJleHBvcnQgZGVmYXVsdCAoY3R4KSA9PiAoXG4gIChlcnIsIHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgaWYocmVxICYmIHJlcS5sb2cgJiYgcmVxLmxvZy5lcnJvcil7XG4gICAgICByZXEubG9nLmVycm9yKHtcbiAgICAgICAgZXJyLFxuICAgICAgICBxdWVyeTogcmVxLnF1ZXJ5LFxuICAgICAgICBib2R5OiByZXEuYm9keSxcbiAgICAgICAgaGVhZGVyczogcmVxLmhlYWRlcnNcbiAgICAgIH0sIChlcnIgfHwge30pLnN0YWNrKVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgfVxuICAgIHJlcy5zdGF0dXMoZXJyLnN0YXR1cyB8fCA1MDApXG4gICAgcmV0dXJuIHJlcy5qc29uKFtdKTtcbiAgICBpZiAocmVzLmVycikgcmV0dXJuIHJlcy5lcnIoZXJyKVxuICAgIHJldHVybiByZXMuanNvbihlcnIpXG4gIH1cbilcbiIsImltcG9ydCB1dWlkIGZyb20gJ3V1aWQnXG5cbmV4cG9ydCBkZWZhdWx0IChwYXJhbXMpID0+IChbXG4gIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIGlmIChfX1BST0RfXykge1xuICAgICAgcmVxLnJlcUlkID0gdXVpZC52NCgpXG4gICAgfSBlbHNlIHtcbiAgICAgIGdsb2JhbC5yZXFJZCA9IDEgKyAoZ2xvYmFsLnJlcUlkIHx8IDApXG4gICAgICByZXEucmVxSWQgPSBnbG9iYWwucmVxSWRcbiAgICB9XG4gICAgaWYgKHBhcmFtcy5sb2cpIHtcbiAgICAgIHJlcS5sb2cgPSBwYXJhbXMubG9nLmNoaWxkKHtcbiAgICAgICAgcmVxSWQ6IHJlcS5yZXFJZCxcbiAgICAgIH0pO1xuICAgIH1cbiAgICBuZXh0KClcbiAgfSxcbl0pXG4iLCJpbXBvcnQgXyBmcm9tICdsb2Rhc2gnXG5leHBvcnQgZGVmYXVsdCAoY3R4KSA9PiAoW1xuICAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICBpZiAoY3R4LnJlcXVlc3RzKSB7XG4gICAgICBfLmZvckVhY2goY3R4LnJlcXVlc3RzLCAodmFsLCBrZXkpID0+IHtcbiAgICAgICAgcmVxW2tleV0gPSB2YWwuYmluZChyZXEpXG4gICAgICB9KVxuICAgICAgLy8gaWYgKHJlcS5hbGxQYXJhbXMpIHtcbiAgICAgIC8vICAgcmVxLnBhcmFtcyA9IHJlcS5hbGxQYXJhbXMuYmluZChyZXEpKClcbiAgICAgIC8vIH1cbiAgICB9XG4gICAgaWYgKGN0eC5yZXNwb25zZXMpIHtcbiAgICAgIF8uZm9yRWFjaChjdHgucmVzcG9uc2VzLCAodmFsLCBrZXkpID0+IHtcbiAgICAgICAgcmVzW2tleV0gPSB2YWwuYmluZChyZXMpXG4gICAgICB9KVxuICAgIH1cbiAgICBuZXh0KClcbiAgfVxuXSlcbiIsIi8vIGZzXG5pbXBvcnQgYWNjZXNzTG9nZ2VyIGZyb20gJy4vYWNjZXNzTG9nZ2VyJ1xuaW1wb3J0IHJlcVBhcnNlciBmcm9tICcuL3JlcVBhcnNlcidcbmltcG9ydCBjYXRjaEVycm9yIGZyb20gJy4vY2F0Y2hFcnJvcidcbmltcG9ydCByZXFMb2cgZnJvbSAnLi9yZXFMb2cnXG5pbXBvcnQgZXh0ZW5kUmVxUmVzIGZyb20gJy4vZXh0ZW5kUmVxUmVzJ1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoY3R4KSB7XG4gIHJldHVybiB7XG4gICAgYWNjZXNzTG9nZ2VyOiBhY2Nlc3NMb2dnZXIoLi4uYXJndW1lbnRzKSxcbiAgICByZXFQYXJzZXI6IHJlcVBhcnNlciguLi5hcmd1bWVudHMpLFxuICAgIGNhdGNoRXJyb3I6IGNhdGNoRXJyb3IoLi4uYXJndW1lbnRzKSxcbiAgICByZXFMb2c6IHJlcUxvZyguLi5hcmd1bWVudHMpLFxuICAgIGV4dGVuZFJlcVJlczogZXh0ZW5kUmVxUmVzKC4uLmFyZ3VtZW50cyksXG4gIH1cbn1cbiIsImltcG9ydCBtb25nb29zZSBmcm9tICdtb25nb29zZSdcblxuY29uc3QgV29ya3NTY2hlbWEgPSBuZXcgbW9uZ29vc2UuU2NoZW1hKHtcbiAgaWQ6IHtcbiAgICB0eXBlOiBTdHJpbmcsXG4gICAgdHJpbTogdHJ1ZSxcbiAgfSxcbiAgdGl0bGU6IHtcbiAgICB0eXBlOiBTdHJpbmcsXG4gICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgdHJpbTogdHJ1ZSxcbiAgfSxcbiAgdGVjaG5vbG9naWVzOiB7XG4gICAgdHlwZTogU3RyaW5nLFxuICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgIHRyaW06IHRydWUsXG4gIH0sXG4gIGltZ1VybDoge1xuICAgIHR5cGU6IFN0cmluZyxcbiAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICB0cmltOiB0cnVlLFxuICB9LFxufSlcblxuXG5leHBvcnQgZGVmYXVsdCBXb3Jrc1NjaGVtYVxuIiwiaW1wb3J0IG1vbmdvb3NlIGZyb20gJ21vbmdvb3NlJ1xuXG5jb25zdCBQb3N0U2NoZW1hID0gbmV3IG1vbmdvb3NlLlNjaGVtYSh7XG4gIGlkOiB7XG4gICAgdHlwZTogU3RyaW5nLFxuICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgIHRyaW06IHRydWUsXG4gIH0sXG4gIHRpdGxlOiB7XG4gICAgdHlwZTogU3RyaW5nLFxuICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgIHRyaW06IHRydWUsXG4gIH0sXG4gIGRhdGU6IHtcbiAgICB0eXBlOiBOdW1iZXIsXG4gICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgdHJpbTogdHJ1ZSxcbiAgfSxcbiAgdGV4dDoge1xuICAgIHR5cGU6IFN0cmluZyxcbiAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICB0cmltOiB0cnVlLFxuICB9LFxufSlcblxuXG5leHBvcnQgZGVmYXVsdCBQb3N0U2NoZW1hO1xuIiwiaW1wb3J0IG1vbmdvb3NlIGZyb20gJ21vbmdvb3NlJ1xuXG5jb25zdCBTa2lsbFNjaGVtYSA9IG5ldyBtb25nb29zZS5TY2hlbWEoe1xuICBpZDoge1xuICAgIHR5cGU6IFN0cmluZyxcbiAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICB0cmltOiB0cnVlLFxuICB9LFxuICBncm91cElkOiB7XG4gICAgdHlwZTogU3RyaW5nLFxuICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgIHRyaW06IHRydWUsXG4gIH0sXG4gIHRpdGxlOiB7XG4gICAgdHlwZTogU3RyaW5nLFxuICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgIHRyaW06IHRydWUsXG4gIH0sXG4gIHZhbHVlOiB7XG4gICAgdHlwZTogTnVtYmVyLFxuICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgIHRyaW06IHRydWUsXG4gIH0sXG59KVxuXG5cbmV4cG9ydCBkZWZhdWx0IFNraWxsU2NoZW1hO1xuIiwiaW1wb3J0IG1vbmdvb3NlIGZyb20gJ21vbmdvb3NlJ1xuXG5pbXBvcnQgU2tpbGxTY2hlbWEgZnJvbSAnLi9Ta2lsbFNjaGVtYSc7XG5cbmNvbnN0IEdyb3Vwc1NraWxscyA9IG5ldyBtb25nb29zZS5TY2hlbWEoe1xuICBpZDoge1xuICAgIHR5cGU6IFN0cmluZyxcbiAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICB0cmltOiB0cnVlLFxuICB9LFxuICB0aXRsZToge1xuICAgIHR5cGU6IFN0cmluZyxcbiAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICB0cmltOiB0cnVlLFxuICB9LFxuICBza2lsbHM6IFtTa2lsbFNjaGVtYV0sXG59KVxuXG5cbmV4cG9ydCBkZWZhdWx0IEdyb3Vwc1NraWxscztcbiIsImltcG9ydCBfIGZyb20gJ2xvZGFzaCdcbmltcG9ydCBqd3QgZnJvbSAnanNvbndlYnRva2VuJ1xuaW1wb3J0IGJjcnlwdCBmcm9tICdiY3J5cHRqcydcbmltcG9ydCBQcm9taXNlIGZyb20gJ2JsdWViaXJkJ1xuY29uc3QgYmNyeXB0R2VuU2FsdCA9IFByb21pc2UucHJvbWlzaWZ5KGJjcnlwdC5nZW5TYWx0KVxuY29uc3QgYmNyeXB0SGFzaCA9IFByb21pc2UucHJvbWlzaWZ5KGJjcnlwdC5oYXNoKVxuY29uc3QgYmNyeXB0Q29tcGFyZSA9IFByb21pc2UucHJvbWlzaWZ5KGJjcnlwdC5jb21wYXJlKVxuaW1wb3J0IG1vbmdvb3NlIGZyb20gJ21vbmdvb3NlJ1xuXG5pbXBvcnQgV29ya1NjaGVtYSBmcm9tICcuL1dvcmtTY2hlbWEnO1xuaW1wb3J0IFBvc3RTY2hlbWEgZnJvbSAnLi9Qb3N0U2NoZW1hJztcbmltcG9ydCBHcm91cHNTa2lsbHMgZnJvbSAnLi9Hcm91cHNTa2lsbHMnO1xuXG5leHBvcnQgZGVmYXVsdCAoY3R4KSA9PiB7XG4gIGlmICghY3R4LmxvZykgdGhyb3cgJyFsb2cnXG5cbiAgY29uc3Qgc2NoZW1hID0gbmV3IG1vbmdvb3NlLlNjaGVtYSh7XG4gICAgZW1haWw6IHtcbiAgICAgIHR5cGU6IFN0cmluZyxcbiAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgdHJpbTogdHJ1ZSxcbiAgICB9LFxuICAgIGlkOiB7XG4gICAgICB0eXBlOiBTdHJpbmcsXG4gICAgICB0cmltOiB0cnVlLFxuICAgIH0sXG4gICAgcGFzc3dvcmQ6IHtcbiAgICAgIHR5cGU6IFN0cmluZyxcbiAgICB9LFxuICAgIGZvcmdvdEVtYWlsVG9rZW46IHtcbiAgICAgIHR5cGU6IFN0cmluZyxcbiAgICAgIHRyaW06IHRydWUsXG4gICAgfSxcbiAgICB3b3JrczogW1dvcmtTY2hlbWFdLFxuICAgIHBvc3RzOiBbUG9zdFNjaGVtYV0sXG4gICAgZ3JvdXBzU2tpbGxzOiBbR3JvdXBzU2tpbGxzXVxuXG4gIH0sIHtcbiAgICBjb2xsZWN0aW9uOiAndXNlcicsXG4gICAgdGltZXN0YW1wczogdHJ1ZSxcbiAgfSlcblxuICBzY2hlbWEuc3RhdGljcy5pc1ZhbGlkRW1haWwgPSBmdW5jdGlvbiAoZW1haWwpIHtcbiAgICBjb25zdCByZSA9IC9eKChbXjw+KClcXFtcXF1cXFxcLiw7Olxcc0BcIl0rKFxcLltePD4oKVxcW1xcXVxcXFwuLDs6XFxzQFwiXSspKil8KFwiLitcIikpQCgoXFxbWzAtOV17MSwzfVxcLlswLTldezEsM31cXC5bMC05XXsxLDN9XFwuWzAtOV17MSwzfV0pfCgoW2EtekEtWlxcLTAtOV0rXFwuKStbYS16QS1aXXsyLH0pKSQvO1xuICAgIHJldHVybiByZS50ZXN0KGVtYWlsKVxuICB9XG4gIHNjaGVtYS5zdGF0aWNzLmdlbmVyYXRlUGFzc3dvcmQgPSBmdW5jdGlvbiAobGVuZ3RoID0gMTApIHtcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIGxlbmd0aClcbiAgfVxuICBzY2hlbWEubWV0aG9kcy50b0pTT04gPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIF8ub21pdCh0aGlzLnRvT2JqZWN0KCksIFsncGFzc3dvcmQnXSlcbiAgfVxuICBzY2hlbWEubWV0aG9kcy5nZXRJZGVudGl0eSA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICBjb25zdCBvYmplY3QgPSBfLnBpY2sodGhpcy50b09iamVjdCgpLCBbJ19pZCcsICdlbWFpbCcsICdpZCddKVxuICAgIGlmICghcGFyYW1zKSByZXR1cm4gb2JqZWN0XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24ob2JqZWN0LCBwYXJhbXMpXG4gIH1cbiAgc2NoZW1hLm1ldGhvZHMuZ2VuZXJhdGVBdXRoVG9rZW4gPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgcmV0dXJuIGp3dC5zaWduKHRoaXMuZ2V0SWRlbnRpdHkocGFyYW1zKSwgY3R4LmNvbmZpZy5qd3Quc2VjcmV0KVxuICB9XG4gIHNjaGVtYS5tZXRob2RzLnZlcmlmeVBhc3N3b3JkID0gYXN5bmMgZnVuY3Rpb24gKHBhc3N3b3JkKSB7XG4gICAgcmV0dXJuIGF3YWl0IGJjcnlwdENvbXBhcmUocGFzc3dvcmQsIHRoaXMucGFzc3dvcmQpXG4gIH1cblxuICBjb25zdCBTQUxUX1dPUktfRkFDVE9SID0gMTBcbiAgc2NoZW1hLnByZSgnc2F2ZScsIGZ1bmN0aW9uIChuZXh0KSB7XG4gICAgaWYgKCF0aGlzLmlzTW9kaWZpZWQoJ3Bhc3N3b3JkJykpIHJldHVybiBuZXh0KCk7XG4gICAgcmV0dXJuIGJjcnlwdEdlblNhbHQoU0FMVF9XT1JLX0ZBQ1RPUilcbiAgICAudGhlbihzYWx0ID0+IHtcbiAgICAgIGJjcnlwdEhhc2godGhpcy5wYXNzd29yZCwgc2FsdClcbiAgICAgIC50aGVuKGhhc2ggPT4ge1xuICAgICAgICB0aGlzLnBhc3N3b3JkID0gaGFzaFxuICAgICAgICBuZXh0KCk7XG4gICAgICB9KVxuICAgIH0pXG4gICAgLmNhdGNoKG5leHQpXG4gIH0pO1xuXG4gIHJldHVybiBtb25nb29zZS5tb2RlbCgnVXNlcicsIHNjaGVtYSk7XG59XG4iLCJpbXBvcnQgVXNlciBmcm9tICcuL1VzZXIvVXNlcic7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICBVc2VyOiBVc2VyKC4uLmFyZ3VtZW50cyksXG4gIH1cbn1cbiIsImltcG9ydCBqd3QgZnJvbSAnZXhwcmVzcy1qd3QnXG5pbXBvcnQgdW5pcWlkIGZyb20gJ3VuaXFpZCc7XG5pbXBvcnQgY3J5cHRvIGZyb20gJ2NyeXB0byc7XG5cbmV4cG9ydCBmdW5jdGlvbiBjYW5vbml6ZShzdHIpIHtcbiAgcmV0dXJuIHN0ci50b0xvd2VyQ2FzZSgpLnRyaW0oKVxufVxuXG5leHBvcnQgZGVmYXVsdCAoY3R4KSA9PiB7XG4gIGNvbnN0IFVzZXIgPSBjdHgubW9kZWxzLlVzZXI7XG5cbiAgY29uc3QgdHJhbnNwb3J0ZXIgPSBjdHgudXRpbHMuVHJhbnNwb3J0ZXI7XG5cbiAgY29uc3QgY29udHJvbGxlciA9IHt9XG5cbiAgY29udHJvbGxlci52YWxpZGF0ZSA9IGFzeW5jIGZ1bmN0aW9uIChyZXEsIHJlcykge1xuICAgIGlmKHJlcS51c2VyKSB7XG4gICAgICBjb25zdCB1c2VyID0gYXdhaXQgVXNlci5maW5kT25lKHtpZDogcmVxLnVzZXIuaWR9KVxuICAgICAgaWYgKCF1c2VyKSByZXR1cm4gcmVzLnN0YXR1cyg0MDQpLmpzb24oW3t2YWxpZGF0ZTogZmFsc2UsIG1lc3NhZ2U6ICfQn9C+0LvRjNC30L7QstCw0YLQtdC70Ywg0L3QtSDQvdCw0LnQtNC10L0g0LIg0LHQsNC30LUnfV0pO1xuICAgICAgcmV0dXJuIFt7XG4gICAgICAgIHZhbGlkYXRlOiB0cnVlLFxuICAgICAgICBfX3BhY2s6IDEsXG4gICAgICAgIGp3dDogcmVxLnVzZXIsXG4gICAgICAgIHVzZXI6IHVzZXIsXG4gICAgICB9XVxuICAgIH1cbiAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDQpLmpzb24oW3t2YWxpZGF0ZTogZmFsc2UsIG1lc3NhZ2U6ICfQn9C+0LvRjNC30L7QstCw0YLQtdC70Ywg0L3QtSDQvdCw0LnQtNC10L0g0LIg0LHQsNC30LUnfV0pO1xuICB9XG5cbiAgY29udHJvbGxlci5nZXRVc2VyRmllbGRzID0gZnVuY3Rpb24gKHJlcSkge1xuICAgIHJldHVybiByZXEuYm9keTtcbiAgfVxuXG4gIGNvbnRyb2xsZXIudmFsaWRhdGlvblVzZXJGaWVsZHMgPSBmdW5jdGlvbih1c2VyRmllbGRzLCByZXMpIHtcbiAgICBsZXQgdmFsaWQgPSB7XG4gICAgICBpc1ZhbGlkOiBmYWxzZSxcbiAgICAgIG1lc3NhZ2U6IFtdXG4gICAgfVxuXG4gICAgaWYoIXVzZXJGaWVsZHMuY2FwdGNoYSkge1xuICAgICAgdmFsaWQuaXNWYWxpZCA9IHRydWU7XG4gICAgICB2YWxpZC5tZXNzYWdlID0gW3tzaWdudXA6IGZhbHNlLCBtZXNzYWdlOiAn0J/QsNGA0LDQvNC10YLRgCBjYXB0Y2hhINC90LUg0L/QtdGA0LXQtNCw0L0g0LjQu9C4INCy0LLQtdC00LXQvSDQvdC10LLQtdGA0L3Qvid9XVxuICAgIH1cblxuICAgIGlmKCF1c2VyRmllbGRzLmVtYWlsIHx8ICF1c2VyRmllbGRzLnBhc3N3b3JkKSB7XG4gICAgICB2YWxpZC5pc1ZhbGlkID0gdHJ1ZTtcbiAgICAgIHZhbGlkLm1lc3NhZ2UgPSBbe3NpZ251cDogZmFsc2UsIG1lc3NhZ2U6ICfQn9Cw0YDQsNC80LXRgtGAcyBlbWFpbCDQuNC70LggcGFzc3dvcmQg0L3QtSDQv9C10YDQtdC00LDQvSd9XVxuICAgIH1cblxuICAgIHJldHVybiB2YWxpZDtcbiAgfVxuXG4gIGNvbnRyb2xsZXIuZ2V0VXNlckNyaXRlcmlhID0gZnVuY3Rpb24gKHJlcSwgcmVzKSB7XG4gICAgY29uc3QgcGFyYW1zID0gcmVxLmJvZHlcbiAgICBpZiAocGFyYW1zLmVtYWlsKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBlbWFpbDogcGFyYW1zLmVtYWlsLFxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDApLmpzb24oW3tzaWdudXA6IGZhbHNlLCBtZXNzYWdlOiAn0J/QsNGA0LDQvNC10YLRgCBlbWFpbCDQvdC1INC/0LXRgNC10LTQsNC9J31dKTtcbiAgfVxuXG4gIGNvbnRyb2xsZXIuc2lnbnVwID0gYXN5bmMgZnVuY3Rpb24gKHJlcSwgcmVzKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHVzZXJGaWVsZHMgPSBjb250cm9sbGVyLmdldFVzZXJGaWVsZHMocmVxLCByZXMpO1xuICAgICAgY29uc3QgdmFsaWQgPSBjb250cm9sbGVyLnZhbGlkYXRpb25Vc2VyRmllbGRzKHVzZXJGaWVsZHMsIHJlcyk7XG4gICAgICBpZiAodmFsaWQuaXNWYWxpZCkge1xuICAgICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDApLmpzb24odmFsaWQubWVzc2FnZSk7XG4gICAgICB9XG4gICAgICBjb25zdCBjcml0ZXJpYSA9IGNvbnRyb2xsZXIuZ2V0VXNlckNyaXRlcmlhKHJlcSwgcmVzKTtcblxuICAgICAgY29uc3QgZXhpc3RVc2VyID0gYXdhaXQgVXNlci5maW5kT25lKGNyaXRlcmlhKVxuICAgICAgaWYgKGV4aXN0VXNlcikgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKFt7c2lnbnVwOiBmYWxzZSwgbWVzc2FnZTogJ9Ci0LDQutC+0LkgZW1haWwg0LfQsNGA0LXQs9C40YHRgtGA0LjRgNC+0LLQsNC9J31dKTtcblxuICAgICAgY29uc3QgdXNlciA9IG5ldyBVc2VyKHtcbiAgICAgICAgLi4udXNlckZpZWxkcyxcbiAgICAgICAgaWQ6IHVuaXFpZCgpLFxuICAgICAgICBmb3Jnb3RFbWFpbFRva2VuOiAnJyxcbiAgICAgIH0pO1xuXG4gICAgICBhd2FpdCB1c2VyLnNhdmUoKVxuXG4gICAgICBjb25zdCByZXN1bHQgPSBbe1xuICAgICAgICBzaWdudXA6IHRydWUsXG4gICAgICAgIHVzZXIsXG4gICAgICAgIHRva2VuOiB1c2VyLmdlbmVyYXRlQXV0aFRva2VuKCksXG4gICAgICB9XVxuXG4gICAgICByZXR1cm4gcmVzLmpzb24ocmVzdWx0KVxuXG4gICAgfSBjYXRjaChlcnIpIHtcbiAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICByZXR1cm4gcmVzLnN0YXR1cyg1MDApLmpzb24oZXJyKVxuICAgIH1cbiAgfVxuXG4gIGNvbnRyb2xsZXIuc2lnbmluID0gYXN5bmMgZnVuY3Rpb24gKHJlcSwgcmVzKSB7XG4gICAgY29uc3QgcGFyYW1zID0gY29udHJvbGxlci5nZXRVc2VyRmllbGRzKHJlcSwgcmVzKTtcbiAgICBpZiAoIXBhcmFtcy5wYXNzd29yZCkgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKFt7bG9naW46IGZhbHNlLCBtZXNzYWdlOiAn0J/QsNGA0LDQvNC10YLRgCBwYXNzd29yZCDQvdC1INC/0LXRgNC10LTQsNC9J31dKTtcblxuICAgIGNvbnN0IGNyaXRlcmlhID0gY29udHJvbGxlci5nZXRVc2VyQ3JpdGVyaWEocmVxKTtcbiAgICBjb25zdCB1c2VyID0gYXdhaXQgVXNlci5maW5kT25lKGNyaXRlcmlhKTtcblxuICAgIGlmICghdXNlcikgcmV0dXJuIHJlcy5zdGF0dXMoNDA0KS5qc29uKFt7bG9naW46IGZhbHNlLCBtZXNzYWdlOiAn0KLQsNC60L7QuSDQv9C+0LvRjNC30L7QstCw0YLQtdC70Ywg0L3QtSDQvdCw0LnQtNC10L0nfV0pO1xuICAgIGF3YWl0IHVzZXIuc2F2ZSgpO1xuXG4gICAgaWYgKCFhd2FpdCB1c2VyLnZlcmlmeVBhc3N3b3JkKHBhcmFtcy5wYXNzd29yZCkpIHtcbiAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbihbe2xvZ2luOiBmYWxzZSwgbWVzc2FnZTogJ9Cf0LXRgNC10LTQsNC90L3Ri9C5INC/0LDRgNC+0LvRjCDQvdC1INC/0L7QtNGF0L7QtNC40YInfV0pO1xuICAgIH1cblxuICAgIHJldHVybiByZXMuanNvbihbe1xuICAgICAgX19wYWNrOiAxLFxuICAgICAgbG9naW46IHRydWUsXG4gICAgICB1c2VyLFxuICAgICAgdG9rZW46IHVzZXIuZ2VuZXJhdGVBdXRoVG9rZW4oKSxcbiAgICB9XSlcbiAgfVxuXG4gIGNvbnRyb2xsZXIuZm9yZ290ID0gYXN5bmMgZnVuY3Rpb24gKHJlcSwgcmVzKSB7XG4gICAgY29uc3QgcGFyYW1zID0gY29udHJvbGxlci5nZXRVc2VyRmllbGRzKHJlcSwgcmVzKTtcblxuICAgIGlmICghcGFyYW1zLmVtYWlsKSByZXR1cm4gcmVzLnN0YXR1cyg0MDApLmpzb24oW3sgZm9yZ290OiBmYWxzZSwgbWVzc2FnZTogJ9Cf0LDRgNCw0LzQtdGC0YAgZW1haWwg0L3QtSDQv9C10YDQtdC00LDQvScgfV0pO1xuXG4gICAgY29uc3QgY3JpdGVyaWEgPSBjb250cm9sbGVyLmdldFVzZXJDcml0ZXJpYShyZXEpO1xuICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBVc2VyLmZpbmRPbmUoY3JpdGVyaWEpO1xuXG4gICAgaWYgKCF1c2VyKSByZXR1cm4gcmVzLnN0YXR1cyg0MDQpLmpzb24oW3tsb2dpbjogZmFsc2UsIG1lc3NhZ2U6ICfQn9C+0LvRjNC30L7QstCw0YLQtdC70Ywg0YEg0YLQsNC60LjQvCBlbWFpbCDQvdC1INC90LDQudC00LXQvSDQsiDQsdCw0LfQtSd9XSk7XG5cbiAgICBjb25zdCB0b2tlbiA9IGF3YWl0IGNyeXB0by5yYW5kb21CeXRlcygzMik7XG5cbiAgICB1c2VyLmZvcmdvdEVtYWlsVG9rZW4gPSB0b2tlbi50b1N0cmluZygnaGV4Jyk7XG4gICAgYXdhaXQgdXNlci5zYXZlKCk7XG5cblxuICAgIGxldCBzaXRlVXJsID0gJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMC8nO1xuICAgIGlmIChfX1BST0RfXykge1xuICAgICAgc2l0ZVVybCA9ICdodHRwOi8vYXBwLmFzaGxpZS5pby8nO1xuICAgIH1cblxuICAgIGxldCBtYWlsVGV4dCA9IGDQn9C10YDQtdC50LTQuNGC0LUg0L/QviDRgdGB0YvQu9C60LUg0YfRgtC+0LHRiyDQuNC30LzQtdC90LjRgtGMINC/0LDRgNC+0LvRjCAke3NpdGVVcmx9YXV0aC9mb3Jnb3QvJHt1c2VyLmZvcmdvdEVtYWlsVG9rZW59YDtcblxuICAgIHZhciBtYWlsT3B0aW9ucyA9IHtcbiAgICAgIGZyb206ICdtb2xvZG95cnVzdGlrQG1haWwucnUnLFxuICAgICAgdG86IHVzZXIuZW1haWwsXG4gICAgICBzdWJqZWN0OiAn0JLQvtGB0YHRgtCw0L3QvtCy0LvQtdC90LjRjyDQv9Cw0YDQvtC70Y8g0YHQsNC50YLQsCBBc2hpbGUuaW8nLFxuICAgICAgdGV4dDogbWFpbFRleHRcbiAgICB9O1xuICAgIGF3YWl0IHRyYW5zcG9ydGVyLnNlbmRNYWlsKG1haWxPcHRpb25zKTtcblxuICAgIGNvbnN0IHJlc3VsdCA9IFt7XG4gICAgICBfX3BhY2s6IDEsXG4gICAgICBmb3Jnb3Q6IHRydWVcbiAgICB9XTtcbiAgICByZXR1cm4gcmVzLmpzb24ocmVzdWx0KTtcbiAgfVxuXG4gIGNvbnRyb2xsZXIuY2hlY2tGb3Jnb3RUb2tlbiA9IGFzeW5jIGZ1bmN0aW9uIChyZXEsIHJlcykge1xuICAgIGNvbnN0IHsgZm9yZ290RW1haWxUb2tlbiB9ID0gcmVxLnBhcmFtcztcblxuICAgIGlmICghZm9yZ290RW1haWxUb2tlbikge1xuICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKFt7Y2hlY2tGb3Jnb3RUb2tlbjogZmFsc2UsIG1lc3NhZ2U6ICfQotC+0LrQtdC9INC90LUg0LHRi9C7INC/0LXRgNC10LTQsNC9J31dKTtcbiAgICB9XG5cbiAgICBjb25zdCBjcml0ZXJpYSA9IHsgZm9yZ290RW1haWxUb2tlbiB9O1xuICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBVc2VyLmZpbmRPbmUoY3JpdGVyaWEpO1xuXG4gICAgaWYgKCF1c2VyKSByZXR1cm4gcmVzLnN0YXR1cyg0MDQpLmpzb24oW3tjaGVja0ZvcmdvdFRva2VuOiBmYWxzZSwgbWVzc2FnZTogJ9Cf0L7Qu9GM0LfQvtCy0LDRgtC10LvRjCDRgSDRgtCw0LrQuNC8INGC0L7QutC10L3QvtC8INC90LUg0L3QsNC50LTQtdC9J31dKTtcblxuICAgIHJldHVybiByZXMuanNvbihbe1xuICAgICAgICBfX3BhY2s6IDEsXG4gICAgICAgIGNoZWNrRm9yZ290VG9rZW46IHRydWVcbiAgICB9XSk7XG4gIH1cblxuICBjb250cm9sbGVyLnJlc2V0ID0gYXN5bmMgZnVuY3Rpb24gKHJlcSwgcmVzKSB7XG4gICAgY29uc3QgcGFyYW1zID0gY29udHJvbGxlci5nZXRVc2VyRmllbGRzKHJlcSwgcmVzKTtcbiAgICBjb25zdCB7IHBhc3N3b3JkLCBjaGVja1Bhc3N3b3JkLCBmb3Jnb3RFbWFpbFRva2VuLCB9ID0gcGFyYW1zO1xuXG4gICAgaWYgKCFwYXNzd29yZCkgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKFt7cmVzZXQ6IGZhbHNlLCBtZXNzYWdlOiAn0J/QsNGA0LDQvNC10YLRgCBwYXNzd29yZCDQvdC1INC/0LXRgNC10LTQsNC9J31dKTtcbiAgICBpZiAoIWNoZWNrUGFzc3dvcmQpIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbihbe3Jlc2V0OiBmYWxzZSwgbWVzc2FnZTogJ9Cf0LDRgNCw0LzQtdGC0YAgY2hlY2tQYXNzd29yZCDQvdC1INC/0LXRgNC10LTQsNC9J31dKTtcbiAgICBpZiAocGFzc3dvcmQgIT09IGNoZWNrUGFzc3dvcmQpIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbihbe3Jlc2V0OiBmYWxzZSwgbWVzc2FnZTogJ9Cf0LDRgNC+0LvQuCDQvdC1INGB0L7QstC/0LDQtNCw0Y7Rgid9XSk7XG4gICAgaWYgKCFmb3Jnb3RFbWFpbFRva2VuKSByZXR1cm4gcmVzLnN0YXR1cyg0MDApLmpzb24oW3tyZXNldDogZmFsc2UsIG1lc3NhZ2U6ICfQn9Cw0YDQsNC80LXRgtGAIGZvcmdvdEVtYWlsVG9rZW4g0L3QtSDQv9C10YDQtdC00LDQvSd9XSk7XG5cbiAgICBjb25zdCBjcml0ZXJpYSA9IHsgZm9yZ290RW1haWxUb2tlbiB9O1xuICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBVc2VyLmZpbmRPbmUoY3JpdGVyaWEpO1xuICAgIGlmICghdXNlcikgcmV0dXJuIHJlcy5zdGF0dXMoNDA0KS5qc29uKFt7cmVzZXQ6IGZhbHNlLCBtZXNzYWdlOiAn0J3QtSDQutC+0YDRgNC10LrRgtC90YvQuSDRgtC+0LrQtdC9J31dKTtcbiAgICB1c2VyLmZvcmdvdEVtYWlsVG9rZW4gPSAnJztcbiAgICB1c2VyLnBhc3N3b3JkID0gcGFzc3dvcmQ7XG5cbiAgICBhd2FpdCB1c2VyLnNhdmUoKTtcblxuICAgIHJldHVybiByZXMuanNvbihbe1xuICAgICAgX19wYWNrOiAxLFxuICAgICAgcmVzZXQ6IHRydWVcbiAgICB9XSlcbiAgfVxuXG4gIGNvbnRyb2xsZXIuZ2V0VG9rZW4gPSBmdW5jdGlvbiAocmVxKSB7XG4gICAgaWYgKHJlcS5oZWFkZXJzLmF1dGhvcml6YXRpb24gJiYgcmVxLmhlYWRlcnMuYXV0aG9yaXphdGlvbi5zcGxpdCggJyAnIClbIDAgXSA9PT0gJ0JlYXJlcicpIHtcbiAgICAgIHJldHVybiByZXEuaGVhZGVycy5hdXRob3JpemF0aW9uLnNwbGl0KCAnICcgKVsgMSBdXG4gICAgfSBlbHNlIGlmIChyZXEuaGVhZGVyc1sneC1hY2Nlc3MtdG9rZW4nXSkge1xuICAgICAgcmV0dXJuIHJlcS5oZWFkZXJzWyd4LWFjY2Vzcy10b2tlbiddO1xuICAgIH0gZWxzZSBpZiAoIHJlcS5xdWVyeSAmJiByZXEucXVlcnkudG9rZW4gKSB7XG4gICAgICByZXR1cm4gcmVxLnF1ZXJ5LnRva2VuXG4gICAgfSBlbHNlIGlmICggcmVxLmNvb2tpZXMgJiYgcmVxLmNvb2tpZXMudG9rZW4gICkge1xuICAgICAgcmV0dXJuIHJlcS5jb29raWVzLnRva2VuXG4gICAgfVxuICAgIGlmIChfX0RFVl9fICYmIGN0eC5jb25maWcgJiYgY3R4LmNvbmZpZy5qd3QgJiYgY3R4LmNvbmZpZy5qd3QuZGV2VG9rZW4pIHJldHVybiBjdHguY29uZmlnLmp3dC5kZXZUb2tlblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29udHJvbGxlci5wYXJzZVRva2VuID0gZnVuY3Rpb24gKHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgY29uc3QgdG9rZW4gPSBjb250cm9sbGVyLmdldFRva2VuKHJlcSlcbiAgICByZXEudG9rZW4gPSB0b2tlblxuICAgIG5leHQoKVxuICB9XG5cbiAgY29udHJvbGxlci5wYXJzZVVzZXIgPSBmdW5jdGlvbiAocmVxLCByZXMsIG5leHQpIHtcbiAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgc2VjcmV0OiBjdHguY29uZmlnICYmIGN0eC5jb25maWcuand0LnNlY3JldCB8fCAnU0VDUkVUJyxcbiAgICAgIGdldFRva2VuOiByZXEgPT4gcmVxLnRva2VuLFxuICAgIH1cbiAgICBqd3Qob3B0aW9ucykocmVxLCByZXMsIChlcnIpID0+IHtcbiAgICAgIGlmIChlcnIpIHJlcS5fZXJySnd0ID0gZXJyXG4gICAgICBuZXh0KClcbiAgICB9KVxuICB9XG5cbiAgY29udHJvbGxlci5pc0F1dGggPSBmdW5jdGlvbiAocmVxLCByZXMsIG5leHQpIHtcbiAgICBpZiAocmVxLl9lcnJKd3QpIHJldHVybiBuZXh0KHJlcS5fZXJySnd0KVxuICAgIGlmICghcmVxLnVzZXIgfHwgIXJlcS51c2VyLl9pZCkgcmV0dXJuIHJlcy5zdGF0dXMoNDAxKS5zZW5kKCchcmVxLnVzZXInKVxuICAgIG5leHQoKVxuICB9XG5cbiAgcmV0dXJuIGNvbnRyb2xsZXJcbn1cbiIsImltcG9ydCB1bmlxaWQgZnJvbSAndW5pcWlkJztcblxuZXhwb3J0IGRlZmF1bHQgKGN0eCkgPT4ge1xuICBjb25zdCBVc2VyID0gY3R4Lm1vZGVscy5Vc2VyO1xuXG4gIGxldCBjb250cm9sbGVyID0ge307XG5cbiAgY29udHJvbGxlci5nZXQgPSBhc3luYyBmdW5jdGlvbihyZXEsIHJlcykge1xuICAgIGNvbnN0IHVzZXJJRCA9IHJlcS51c2VyLmlkO1xuICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBVc2VyLmZpbmRPbmUoe2lkOiB1c2VySUR9KTtcblxuICAgIHJldHVybiByZXMuanNvbih1c2VyKTtcbiAgfVxuXG4gIGNvbnRyb2xsZXIuZ2V0V29ya3MgPSBhc3luYyBmdW5jdGlvbihyZXEsIHJlcykge1xuICAgIGNvbnN0IHVzZXJJRCA9IHJlcS5wYXJhbXMuaWQ7XG4gICAgY29uc3QgdXNlciA9IGF3YWl0IFVzZXIuZmluZE9uZSh7IGlkOiB1c2VySUQgfSk7XG5cbiAgICByZXR1cm4gcmVzLmpzb24odXNlci53b3Jrcyk7XG4gIH1cblxuICBjb250cm9sbGVyLmFkZFdvcmsgPSBhc3luYyBmdW5jdGlvbihyZXEsIHJlcykge1xuICAgIGNvbnN0IHBhcmFtcyA9IHJlcS5ib2R5XG4gICAgaWYgKCFwYXJhbXMudGl0bGUpIHtcbiAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbihbe3NpZ251cDogZmFsc2UsIG1lc3NhZ2U6ICfQl9Cw0L/QvtC70L3QuNGC0LUg0LLRgdC1INC/0L7Qu9GPJ31dKTtcbiAgICB9XG4gICAgaWYgKCFwYXJhbXMudGVjaG5vbG9naWVzKSB7XG4gICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDApLmpzb24oW3tzaWdudXA6IGZhbHNlLCBtZXNzYWdlOiAn0JfQsNC/0L7Qu9C90LjRgtC1INCy0YHQtSDQv9C+0LvRjyd9XSk7XG4gICAgfVxuICAgIGlmICghcGFyYW1zLmltZ1VybCkge1xuICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKFt7c2lnbnVwOiBmYWxzZSwgbWVzc2FnZTogJ9CX0LDQv9C+0LvQvdC40YLQtSDQstGB0LUg0L/QvtC70Y8nfV0pO1xuICAgIH1cblxuICAgIGNvbnN0IHsgdGl0bGUsIHRlY2hub2xvZ2llcywgaW1nVXJsLCB9ID0gcGFyYW1zO1xuXG4gICAgY29uc3QgdXNlcklEID0gcmVxLnVzZXIuaWQ7XG4gICAgY29uc3QgdXNlciA9IGF3YWl0IFVzZXIuZmluZE9uZSh7aWQ6IHVzZXJJRH0pO1xuXG4gICAgY29uc3Qgd29yayA9IHtcbiAgICAgIGlkOiB1bmlxaWQoKSxcbiAgICAgIHRpdGxlLFxuICAgICAgdGVjaG5vbG9naWVzLFxuICAgICAgaW1nVXJsLFxuICAgIH1cblxuICAgIHVzZXIud29ya3MucHVzaCh3b3JrKTtcbiAgICBhd2FpdCB1c2VyLnNhdmUoKTtcblxuICAgIHJldHVybiByZXMuanNvbihbeyBmbGFnOiB0cnVlLCBtZXNzYWdlOiAn0J/RgNC+0LXQutGCINGD0YHQv9C10YjQvdC+INC00L7QsdCw0LLQu9C10L0nfV0pO1xuICB9XG5cblxuICBjb250cm9sbGVyLmdldFBvc3RzID0gYXN5bmMgZnVuY3Rpb24ocmVxLCByZXMpIHtcbiAgICBjb25zdCB1c2VySUQgPSByZXEucGFyYW1zLmlkO1xuICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBVc2VyLmZpbmRPbmUoeyBpZDogdXNlcklEIH0pO1xuXG4gICAgcmV0dXJuIHJlcy5qc29uKHVzZXIucG9zdHMpO1xuICB9XG5cbiAgY29udHJvbGxlci5hZGRQb3N0ID0gYXN5bmMgZnVuY3Rpb24ocmVxLCByZXMpIHtcbiAgICBjb25zdCBwYXJhbXMgPSByZXEuYm9keVxuICAgIGlmICghcGFyYW1zLnRpdGxlKSB7XG4gICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDApLmpzb24oW3tzaWdudXA6IGZhbHNlLCBtZXNzYWdlOiAn0JfQsNC/0L7Qu9C90LjRgtC1INCy0YHQtSDQv9C+0LvRjyd9XSk7XG4gICAgfVxuICAgIGlmICghcGFyYW1zLmRhdGUpIHtcbiAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbihbe3NpZ251cDogZmFsc2UsIG1lc3NhZ2U6ICfQl9Cw0L/QvtC70L3QuNGC0LUg0LLRgdC1INC/0L7Qu9GPJ31dKTtcbiAgICB9XG4gICAgaWYgKCFwYXJhbXMudGV4dCkge1xuICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKFt7c2lnbnVwOiBmYWxzZSwgbWVzc2FnZTogJ9CX0LDQv9C+0LvQvdC40YLQtSDQstGB0LUg0L/QvtC70Y8nfV0pO1xuICAgIH1cblxuICAgIGNvbnN0IHsgdGl0bGUsIGRhdGUsIHRleHQsIH0gPSBwYXJhbXM7XG5cbiAgICBjb25zdCB1c2VySUQgPSByZXEudXNlci5pZDtcbiAgICBjb25zdCB1c2VyID0gYXdhaXQgVXNlci5maW5kT25lKHtpZDogdXNlcklEfSk7XG5cbiAgICBjb25zdCBwb3N0ID0ge1xuICAgICAgaWQ6IHVuaXFpZCgpLFxuICAgICAgdGl0bGUsXG4gICAgICBkYXRlLFxuICAgICAgdGV4dCxcbiAgICB9XG5cbiAgICB1c2VyLnBvc3RzLnB1c2gocG9zdCk7XG4gICAgYXdhaXQgdXNlci5zYXZlKCk7XG5cbiAgICByZXR1cm4gcmVzLmpzb24oW3sgZmxhZzogdHJ1ZSwgbWVzc2FnZTogJ9Cf0L7RgdGCINGD0YHQv9C10YjQvdC+INC00L7QsdCw0LLQu9C10L0nfV0pO1xuICB9XG5cblxuICByZXR1cm4gY29udHJvbGxlclxufVxuIiwiaW1wb3J0IEF1dGggZnJvbSAnLi9BdXRoL2luZGV4JztcbmltcG9ydCBVc2VyIGZyb20gJy4vVXNlci9pbmRleCc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICBBdXRoOiBBdXRoKC4uLmFyZ3VtZW50cyksXG4gICAgVXNlcjogVXNlciguLi5hcmd1bWVudHMpLFxuICB9XG59XG4iLCJpbXBvcnQgbm9kZW1haWxlciBmcm9tICdub2RlbWFpbGVyJztcbmltcG9ydCBzbXRwVHJhbnNwb3J0IGZyb20gJ25vZGVtYWlsZXItc210cC10cmFuc3BvcnQnO1xuXG5leHBvcnQgZGVmYXVsdCAoY3R4KSA9PiB7XG4gIGlmICghY3R4LmxvZykgdGhyb3cgJyFsb2cnXG5cbiAgY29uc3QgdHJhbnNwb3J0ZXIgPSBub2RlbWFpbGVyLmNyZWF0ZVRyYW5zcG9ydChzbXRwVHJhbnNwb3J0KGN0eC5jb25maWcubm9kZW1haWxlcikpO1xuXG4gIHJldHVybiAgdHJhbnNwb3J0ZXI7XG59XG4iLCJpbXBvcnQgVHJhbnNwb3J0ZXIgZnJvbSAnLi9Ob2RlbWFpbGVyL2luZGV4JztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKCkge1xuICByZXR1cm4ge1xuICAgIFRyYW5zcG9ydGVyOiBUcmFuc3BvcnRlciguLi5hcmd1bWVudHMpLFxuICB9XG59XG4iLCJpbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHsgQXN5bmNSb3V0ZXIgfSBmcm9tICdleHByZXNzLWFzeW5jLXJvdXRlcic7XG5cbmV4cG9ydCBkZWZhdWx0IChjdHgpID0+IHtcbiAgaWYgKCFfLmhhcyhjdHgsICdjb250cm9sbGVycy5BdXRoLnNpZ251cCcpKSB0aHJvdyAnIWNvbnRyb2xsZXJzLkF1dGguc2lnbnVwJ1xuICBpZiAoIV8uaGFzKGN0eCwgJ2NvbnRyb2xsZXJzLkF1dGguc2lnbmluJykpIHRocm93ICchY29udHJvbGxlcnMuQXV0aC5zaWduaW4nXG4gIGlmICghXy5oYXMoY3R4LCAnY29udHJvbGxlcnMuQXV0aC52YWxpZGF0ZScpKSB0aHJvdyAnIWNvbnRyb2xsZXJzLkF1dGgudmFsaWRhdGUnXG4gIGlmICghXy5oYXMoY3R4LCAnY29udHJvbGxlcnMuQXV0aC5mb3Jnb3QnKSkgdGhyb3cgJyFjb250cm9sbGVycy5BdXRoLmZvcmdvdCdcbiAgaWYgKCFfLmhhcyhjdHgsICdjb250cm9sbGVycy5BdXRoLmNoZWNrRm9yZ290VG9rZW4nKSkgdGhyb3cgJyFjb250cm9sbGVycy5BdXRoLmNoZWNrRm9yZ290VG9rZW4nXG4gIGlmICghXy5oYXMoY3R4LCAnY29udHJvbGxlcnMuQXV0aC5yZXNldCcpKSB0aHJvdyAnIWNvbnRyb2xsZXJzLkF1dGgucmVzZXQnXG5cblx0Y29uc3QgYXBpID0gQXN5bmNSb3V0ZXIoKTtcblxuICBhcGkuYWxsKCcvdmFsaWRhdGUnLCBjdHguY29udHJvbGxlcnMuQXV0aC52YWxpZGF0ZSk7XG4gIGFwaS5wb3N0KCcvc2lnbnVwJywgY3R4LmNvbnRyb2xsZXJzLkF1dGguc2lnbnVwKTtcbiAgYXBpLnBvc3QoJy9zaWduaW4nLCBjdHguY29udHJvbGxlcnMuQXV0aC5zaWduaW4pO1xuICBhcGkucG9zdCgnL2ZvcmdvdCcsIGN0eC5jb250cm9sbGVycy5BdXRoLmZvcmdvdCk7XG4gIGFwaS5nZXQoJy9mb3Jnb3QvOmZvcmdvdEVtYWlsVG9rZW4nLCBjdHguY29udHJvbGxlcnMuQXV0aC5jaGVja0ZvcmdvdFRva2VuKTtcbiAgYXBpLnBvc3QoJy9yZXNldCcsIGN0eC5jb250cm9sbGVycy5BdXRoLnJlc2V0KTtcblxuXHRyZXR1cm4gYXBpO1xufVxuIiwiaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcblxuaW1wb3J0IHsgQXN5bmNSb3V0ZXIgfSBmcm9tICdleHByZXNzLWFzeW5jLXJvdXRlcic7XG5cbmV4cG9ydCBkZWZhdWx0IChjdHgpID0+IHtcbiAgaWYgKCFfLmhhcyhjdHgsICdjb250cm9sbGVycy5Vc2VyLmdldCcpKSB0aHJvdyAnIWNvbnRyb2xsZXJzLlVzZXIuZ2V0J1xuICBpZiAoIV8uaGFzKGN0eCwgJ2NvbnRyb2xsZXJzLlVzZXIuZ2V0V29ya3MnKSkgdGhyb3cgJyFjb250cm9sbGVycy5Vc2VyLmdldFdvcmtzJ1xuICBpZiAoIV8uaGFzKGN0eCwgJ2NvbnRyb2xsZXJzLlVzZXIuYWRkV29yaycpKSB0aHJvdyAnIWNvbnRyb2xsZXJzLlVzZXIuYWRkV29yaydcbiAgaWYgKCFfLmhhcyhjdHgsICdjb250cm9sbGVycy5Vc2VyLmdldFBvc3RzJykpIHRocm93ICchY29udHJvbGxlcnMuVXNlci5nZXRQb3N0cydcbiAgaWYgKCFfLmhhcyhjdHgsICdjb250cm9sbGVycy5Vc2VyLmFkZFBvc3QnKSkgdGhyb3cgJyFjb250cm9sbGVycy5Vc2VyLmFkZFBvc3QnXG5cblx0Y29uc3QgYXBpID0gQXN5bmNSb3V0ZXIoKTtcblxuICBhcGkuZ2V0KCcvJywgY3R4LmNvbnRyb2xsZXJzLlVzZXIuZ2V0KTtcbiAgYXBpLmdldCgnLzppZC93b3JrcycsIGN0eC5jb250cm9sbGVycy5Vc2VyLmdldFdvcmtzKTtcbiAgYXBpLnBvc3QoJy86aWQvd29ya3MnLCBjdHguY29udHJvbGxlcnMuVXNlci5hZGRXb3JrKTtcbiAgYXBpLmdldCgnLzppZC9wb3N0cycsIGN0eC5jb250cm9sbGVycy5Vc2VyLmdldFBvc3RzKTtcbiAgYXBpLnBvc3QoJy86aWQvcG9zdHMnLCBjdHguY29udHJvbGxlcnMuVXNlci5hZGRQb3N0KTtcblxuXHRyZXR1cm4gYXBpO1xufVxuIiwiaW1wb3J0IHsgQXN5bmNSb3V0ZXIgfSBmcm9tICdleHByZXNzLWFzeW5jLXJvdXRlcic7XG5pbXBvcnQgZXhwcmVzc0p3dCBmcm9tICdleHByZXNzLWp3dCc7XG5pbXBvcnQgZ2V0QXV0aCBmcm9tICcuL2F1dGgvaW5kZXgnO1xuaW1wb3J0IGdldFVzZXIgZnJvbSAnLi91c2VyL2luZGV4JztcblxuXG5leHBvcnQgZGVmYXVsdCAoY3R4KSA9PiB7XG5cdGNvbnN0IGFwaSA9IEFzeW5jUm91dGVyKCk7XG5cbiAgYXBpLmFsbCgnLycsICgpID0+ICh7b2s6IHRydWUsIHZlcnNpb246ICcxLjAuMCd9KSlcblxuICBhcGkudXNlKCcvYXV0aCcsIGdldEF1dGgoY3R4KSk7XG5cdGFwaS51c2UoJy91c2VycycsIGV4cHJlc3NKd3Qoe3NlY3JldDogY3R4LmNvbmZpZy5qd3Quc2VjcmV0fSksIGdldFVzZXIoY3R4KSk7XG5cblx0Ly8gYXBpLnVzZSgnLycsIChlcnIsIHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gIC8vICAgY29uc29sZS5sb2coZXJyKTtcblx0Ly8gXHRyZXR1cm4gcmVzLnN0YXR1cyg0MDEpLmpzb24oW3sgZmxhZzogZmFsc2UsIG1lc3NhZ2U6ICfQndC1INCw0LLRgtC+0YDQuNC30L7QstCw0L0nIH1dKVxuXHQvLyB9KVxuXG5cdHJldHVybiBhcGk7XG59XG4iLCJpbXBvcnQgYnVueWFuIGZyb20gJ2J1bnlhbic7XG5pbXBvcnQgZXhwcmVzcyBmcm9tICdleHByZXNzJztcbmltcG9ydCBtb25nb29zZSBmcm9tICdtb25nb29zZSc7XG5cbmltcG9ydCBnZXRNaWRkbGV3YXJlcyBmcm9tICcuL21pZGRsZXdhcmVzL2luZGV4JztcbmltcG9ydCBnZXRNb2RlbHMgZnJvbSAnLi9tb2RlbHMvaW5kZXgnO1xuaW1wb3J0IGdldENvbnRyb2xsZXJzIGZyb20gJy4vY29udHJvbGxlcnMvaW5kZXgnO1xuaW1wb3J0IGdldFV0aWxzIGZyb20gJy4vdXRpbHMvaW5kZXgnO1xuaW1wb3J0IGdldEFwaSBmcm9tICcuL2FwaS9hcGknO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBcHAge1xuICBjb25zdHJ1Y3RvcihwYXJhbXMgPSB7fSkge1xuICAgIE9iamVjdC5hc3NpZ24odGhpcywgcGFyYW1zKTtcbiAgICBpZiAoIXRoaXMubG9nKSB0aGlzLmxvZyA9IHRoaXMuZ2V0TG9nZ2VyKCk7XG4gICAgdGhpcy5pbml0KCk7XG4gIH1cblxuICBnZXRMb2dnZXIocGFyYW1zKSB7XG4gICAgcmV0dXJuIGJ1bnlhbi5jcmVhdGVMb2dnZXIoT2JqZWN0LmFzc2lnbih7XG4gICAgICBuYW1lOiAnYXBwJyxcbiAgICAgIHNyYzogX19ERVZfXyxcbiAgICAgIGxldmVsOiAndHJhY2UnLFxuICAgIH0sIHBhcmFtcykpXG4gIH1cblxuICBnZXRNaWRkbGV3YXJlcygpIHtcbiAgICByZXR1cm4gZ2V0TWlkZGxld2FyZXModGhpcyk7XG4gIH1cblxuICBnZXRNb2RlbHMoKSB7XG4gICAgcmV0dXJuIGdldE1vZGVscyh0aGlzKTtcbiAgfVxuXG4gIGdldERhdGFiYXNlKCkge1xuICAgIHJldHVybiB7XG4gICAgICBydW46ICgpID0+IHtcbiAgICAgICAgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICBtb25nb29zZS5jb25uZWN0KHRoaXMuY29uZmlnLmRiLnVybCwge3VzZU5ld1VybFBhcnNlcjogdHJ1ZX0pO1xuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZ2V0Q29udHJvbGxlcnMoKSB7XG4gICAgcmV0dXJuIGdldENvbnRyb2xsZXJzKHRoaXMpO1xuICB9XG5cbiAgZ2V0VXRpbHMoKSB7XG4gICAgcmV0dXJuIGdldFV0aWxzKHRoaXMpO1xuICB9XG5cbiAgaW5pdCgpIHtcbiAgICB0aGlzLmxvZy50cmFjZSgnQXBwIGluaXQnKTtcbiAgICB0aGlzLmFwcCA9IGV4cHJlc3MoKTtcbiAgICB0aGlzLmRiID0gdGhpcy5nZXREYXRhYmFzZSgpO1xuXG4gICAgdGhpcy51dGlscyA9IHRoaXMuZ2V0VXRpbHMoKTtcbiAgICB0aGlzLmxvZy50cmFjZSgndXRpbHMnLCBPYmplY3Qua2V5cyh0aGlzLnV0aWxzKSk7XG5cbiAgICB0aGlzLm1pZGRsZXdhcmVzID0gdGhpcy5nZXRNaWRkbGV3YXJlcygpO1xuICAgIHRoaXMubG9nLnRyYWNlKCdtaWRkbGV3YXJlcycsIE9iamVjdC5rZXlzKHRoaXMubWlkZGxld2FyZXMpKTtcblxuICAgIHRoaXMubW9kZWxzID0gdGhpcy5nZXRNb2RlbHMoKTtcbiAgICB0aGlzLmxvZy50cmFjZSgnbW9kZWxzJywgT2JqZWN0LmtleXModGhpcy5tb2RlbHMpKTtcblxuICAgIHRoaXMuY29udHJvbGxlcnMgPSB0aGlzLmdldENvbnRyb2xsZXJzKCk7XG4gICAgdGhpcy5sb2cudHJhY2UoJ2NvbnRyb2xsZXJzJywgT2JqZWN0LmtleXModGhpcy5jb250cm9sbGVycykpO1xuXG4gICAgdGhpcy51c2VNaWRkbGV3YXJlcygpO1xuICAgIHRoaXMudXNlUm91dGVzKCk7XG4gICAgdGhpcy51c2VEZWZhdWx0Um91dGUoKTtcbiAgfVxuXG4gIHVzZU1pZGRsZXdhcmVzKCkge1xuICAgIHRoaXMuYXBwLnVzZSh0aGlzLm1pZGRsZXdhcmVzLmNhdGNoRXJyb3IpO1xuICAgIHRoaXMuYXBwLnVzZSh0aGlzLm1pZGRsZXdhcmVzLnJlcUxvZyk7XG4gICAgdGhpcy5hcHAudXNlKHRoaXMubWlkZGxld2FyZXMuYWNjZXNzTG9nZ2VyKTtcbiAgICB0aGlzLmFwcC51c2UodGhpcy5taWRkbGV3YXJlcy5yZXFQYXJzZXIpO1xuXG4gICAgdGhpcy5hcHAudXNlKHRoaXMuY29udHJvbGxlcnMuQXV0aC5wYXJzZVRva2VuKTtcbiAgICB0aGlzLmFwcC51c2UodGhpcy5jb250cm9sbGVycy5BdXRoLnBhcnNlVXNlcik7XG4gIH1cblxuICB1c2VSb3V0ZXMoKSB7XG4gICAgY29uc3QgYXBpID0gZ2V0QXBpKHRoaXMpO1xuICAgIHRoaXMuYXBwLnVzZSgnL2FwaS92MScsIGFwaSk7XG4gIH1cblxuICB1c2VEZWZhdWx0Um91dGUoKSB7XG4gICAgdGhpcy5hcHAudXNlKChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgY29uc3QgZXJyID0gKCdSb3V0ZSBub3QgZm91bmQnKTtcbiAgICAgIG5leHQoZXJyKTtcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIHJ1bigpIHtcbiAgICB0aGlzLmxvZy50cmFjZSgnQXBwIHJ1bicpO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLmRiLnJ1bigpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy5sb2cuZmF0YWwoZXJyKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICB0aGlzLmFwcC5saXN0ZW4odGhpcy5jb25maWcucG9ydCwgKCkgPT4ge1xuICAgICAgICB0aGlzLmxvZy5pbmZvKGBBcHAgXCIke3RoaXMuY29uZmlnLm5hbWV9XCIgcnVubmluZyBvbiBwb3J0ICR7dGhpcy5jb25maWcucG9ydH0hYCk7XG4gICAgICAgIHJlc29sdmUodGhpcyk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufVxuIiwiaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZy9pbmRleCc7XG5pbXBvcnQgQXBwIGZyb20gJy4vQXBwJztcblxuY29uc3QgYXBwID0gbmV3IEFwcCh7IGNvbmZpZyB9KTtcbmFwcC5ydW4oKTtcblxuIl0sIm5hbWVzIjpbImdsb2JhbCIsIl9fREVWX18iLCJfX1BST0RfXyIsIm5hbWUiLCJwb3J0IiwiZGIiLCJ1cmwiLCJqd3QiLCJzZWNyZXQiLCJub2RlbWFpbGVyIiwic2VydmljZSIsImhvc3QiLCJhdXRoIiwidXNlciIsInBhc3MiLCJsZXZlbEZuIiwiZGF0YSIsImVyciIsInN0YXR1cyIsImR1cmF0aW9uIiwibG9nU3RhcnQiLCJsZWZ0UGFkIiwibWV0aG9kIiwicmVxSWQiLCJsb2dGaW5pc2giLCJ0aW1lIiwidG9GaXhlZCIsImxlbmd0aCIsInBhcmFtcyIsInJlcSIsInJlcyIsIm5leHQiLCJsb2ciLCJjaGlsZCIsImNvbXBvbmVudCIsIndzIiwiaGVhZGVycyIsImJhc2VVcmwiLCJyZWZlcmVyIiwiaGVhZGVyIiwiaXAiLCJjb25uZWN0aW9uIiwicmVtb3RlQWRkcmVzcyIsInNvY2tldCIsImRlYnVnIiwiYm9keSIsInRyYWNlIiwiSlNPTiIsInN0cmluZ2lmeSIsImhydGltZSIsInByb2Nlc3MiLCJsb2dnaW5nIiwic3RhdHVzQ29kZSIsImdldEhlYWRlciIsImRpZmYiLCJvbiIsImN0eCIsImJvZHlQYXJzZXIiLCJqc29uIiwidXJsZW5jb2RlZCIsImV4dGVuZGVkIiwiY29va2llUGFyc2VyIiwiY29ycyIsImVycm9yIiwicXVlcnkiLCJzdGFjayIsImNvbnNvbGUiLCJ1dWlkIiwidjQiLCJyZXF1ZXN0cyIsIl8iLCJmb3JFYWNoIiwidmFsIiwia2V5IiwiYmluZCIsInJlc3BvbnNlcyIsImFjY2Vzc0xvZ2dlciIsImFyZ3VtZW50cyIsInJlcVBhcnNlciIsImNhdGNoRXJyb3IiLCJyZXFMb2ciLCJleHRlbmRSZXFSZXMiLCJXb3Jrc1NjaGVtYSIsIm1vbmdvb3NlIiwiU2NoZW1hIiwiaWQiLCJ0eXBlIiwiU3RyaW5nIiwidHJpbSIsInRpdGxlIiwicmVxdWlyZWQiLCJ0ZWNobm9sb2dpZXMiLCJpbWdVcmwiLCJQb3N0U2NoZW1hIiwiZGF0ZSIsIk51bWJlciIsInRleHQiLCJTa2lsbFNjaGVtYSIsImdyb3VwSWQiLCJ2YWx1ZSIsIkdyb3Vwc1NraWxscyIsInNraWxscyIsImJjcnlwdEdlblNhbHQiLCJQcm9taXNlIiwicHJvbWlzaWZ5IiwiYmNyeXB0IiwiZ2VuU2FsdCIsImJjcnlwdEhhc2giLCJoYXNoIiwiYmNyeXB0Q29tcGFyZSIsImNvbXBhcmUiLCJzY2hlbWEiLCJlbWFpbCIsInBhc3N3b3JkIiwiZm9yZ290RW1haWxUb2tlbiIsIndvcmtzIiwiV29ya1NjaGVtYSIsInBvc3RzIiwiZ3JvdXBzU2tpbGxzIiwiY29sbGVjdGlvbiIsInRpbWVzdGFtcHMiLCJzdGF0aWNzIiwiaXNWYWxpZEVtYWlsIiwicmUiLCJ0ZXN0IiwiZ2VuZXJhdGVQYXNzd29yZCIsIk1hdGgiLCJyYW5kb20iLCJ0b1N0cmluZyIsInN1YnN0ciIsIm1ldGhvZHMiLCJ0b0pTT04iLCJvbWl0IiwidG9PYmplY3QiLCJnZXRJZGVudGl0eSIsIm9iamVjdCIsInBpY2siLCJPYmplY3QiLCJhc3NpZ24iLCJnZW5lcmF0ZUF1dGhUb2tlbiIsInNpZ24iLCJjb25maWciLCJ2ZXJpZnlQYXNzd29yZCIsIlNBTFRfV09SS19GQUNUT1IiLCJwcmUiLCJpc01vZGlmaWVkIiwidGhlbiIsInNhbHQiLCJtb2RlbCIsIlVzZXIiLCJtb2RlbHMiLCJ0cmFuc3BvcnRlciIsInV0aWxzIiwiVHJhbnNwb3J0ZXIiLCJjb250cm9sbGVyIiwidmFsaWRhdGUiLCJmaW5kT25lIiwibWVzc2FnZSIsIl9fcGFjayIsImdldFVzZXJGaWVsZHMiLCJ2YWxpZGF0aW9uVXNlckZpZWxkcyIsInVzZXJGaWVsZHMiLCJ2YWxpZCIsImlzVmFsaWQiLCJjYXB0Y2hhIiwic2lnbnVwIiwiZ2V0VXNlckNyaXRlcmlhIiwiY3JpdGVyaWEiLCJleGlzdFVzZXIiLCJ1bmlxaWQiLCJzYXZlIiwicmVzdWx0IiwidG9rZW4iLCJzaWduaW4iLCJsb2dpbiIsImZvcmdvdCIsImNyeXB0byIsInJhbmRvbUJ5dGVzIiwic2l0ZVVybCIsIm1haWxUZXh0IiwibWFpbE9wdGlvbnMiLCJmcm9tIiwidG8iLCJzdWJqZWN0Iiwic2VuZE1haWwiLCJjaGVja0ZvcmdvdFRva2VuIiwicmVzZXQiLCJjaGVja1Bhc3N3b3JkIiwiZ2V0VG9rZW4iLCJhdXRob3JpemF0aW9uIiwic3BsaXQiLCJjb29raWVzIiwiZGV2VG9rZW4iLCJwYXJzZVRva2VuIiwicGFyc2VVc2VyIiwib3B0aW9ucyIsIl9lcnJKd3QiLCJpc0F1dGgiLCJfaWQiLCJzZW5kIiwiZ2V0IiwidXNlcklEIiwiZ2V0V29ya3MiLCJhZGRXb3JrIiwid29yayIsInB1c2giLCJmbGFnIiwiZ2V0UG9zdHMiLCJhZGRQb3N0IiwicG9zdCIsIkF1dGgiLCJjcmVhdGVUcmFuc3BvcnQiLCJzbXRwVHJhbnNwb3J0IiwiaGFzIiwiYXBpIiwiQXN5bmNSb3V0ZXIiLCJhbGwiLCJjb250cm9sbGVycyIsIm9rIiwidmVyc2lvbiIsInVzZSIsImdldEF1dGgiLCJleHByZXNzSnd0IiwiZ2V0VXNlciIsIkFwcCIsImdldExvZ2dlciIsImluaXQiLCJidW55YW4iLCJjcmVhdGVMb2dnZXIiLCJzcmMiLCJsZXZlbCIsImdldE1pZGRsZXdhcmVzIiwiZ2V0TW9kZWxzIiwicnVuIiwicmVzb2x2ZSIsImNvbm5lY3QiLCJ1c2VOZXdVcmxQYXJzZXIiLCJnZXRDb250cm9sbGVycyIsImdldFV0aWxzIiwiYXBwIiwiZXhwcmVzcyIsImdldERhdGFiYXNlIiwia2V5cyIsIm1pZGRsZXdhcmVzIiwidXNlTWlkZGxld2FyZXMiLCJ1c2VSb3V0ZXMiLCJ1c2VEZWZhdWx0Um91dGUiLCJnZXRBcGkiLCJmYXRhbCIsImxpc3RlbiIsImluZm8iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0VBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQixLQUFqQjs7RUFFQUQsTUFBTSxDQUFDRSxRQUFQLEdBQWtCLElBQWxCO0FBRUEsZUFBZTtFQUNiQyxFQUFBQSxJQUFJLEVBQUUsZ0JBRE87RUFFYkMsRUFBQUEsSUFBSSxFQUFFLElBRk87RUFHYkMsRUFBQUEsRUFBRSxFQUFFO0VBQ0ZDLElBQUFBLEdBQUcsRUFBRTtFQURILEdBSFM7RUFNYkMsRUFBQUEsR0FBRyxFQUFFO0VBQ0hDLElBQUFBLE1BQU0sRUFBRTtFQURMLEdBTlE7RUFTYkMsRUFBQUEsVUFBVSxFQUFFO0VBQ1ZDLElBQUFBLE9BQU8sRUFBRSxNQURDO0VBRVZDLElBQUFBLElBQUksRUFBRSxjQUZJO0VBR1ZDLElBQUFBLElBQUksRUFBRTtFQUNKQyxNQUFBQSxJQUFJLEVBQUUsdUJBREY7RUFFSkMsTUFBQUEsSUFBSSxFQUFFO0VBRkY7RUFISTtFQVRDLENBQWY7O0VDRkEsU0FBU0MsT0FBVCxDQUFpQkMsSUFBakIsRUFBdUI7RUFDckIsTUFBSUEsSUFBSSxDQUFDQyxHQUFMLElBQVlELElBQUksQ0FBQ0UsTUFBTCxJQUFlLEdBQTNCLElBQWtDRixJQUFJLENBQUNHLFFBQUwsR0FBZ0IsS0FBdEQsRUFBNkQ7RUFBRTtFQUM3RCxXQUFPLE9BQVA7RUFDRCxHQUZELE1BRU8sSUFBSUgsSUFBSSxDQUFDRSxNQUFMLElBQWUsR0FBZixJQUFzQkYsSUFBSSxDQUFDRyxRQUFMLEdBQWdCLElBQTFDLEVBQWdEO0VBQUU7RUFDdkQsV0FBTyxNQUFQO0VBQ0Q7O0VBQ0QsU0FBTyxNQUFQO0VBQ0Q7O0VBRUQsU0FBU0MsUUFBVCxDQUFrQkosSUFBbEIsRUFBd0I7RUFDdEIsbUJBQVVLLE9BQU8sQ0FBQ0wsSUFBSSxDQUFDTSxNQUFOLEVBQWMsQ0FBZCxDQUFqQixjQUFxQ04sSUFBSSxDQUFDVixHQUExQyw0QkFBK0RVLElBQUksQ0FBQ08sS0FBcEU7RUFDRDs7RUFFRCxTQUFTQyxTQUFULENBQW1CUixJQUFuQixFQUF5QjtFQUN2QixNQUFNUyxJQUFJLEdBQUcsQ0FBQ1QsSUFBSSxDQUFDRyxRQUFMLElBQWlCLENBQWxCLEVBQXFCTyxPQUFyQixDQUE2QixDQUE3QixDQUFiO0VBQ0EsTUFBTUMsTUFBTSxHQUFHWCxJQUFJLENBQUNXLE1BQUwsSUFBZSxDQUE5QjtFQUNBLG1CQUFVTixPQUFPLENBQUNMLElBQUksQ0FBQ00sTUFBTixFQUFjLENBQWQsQ0FBakIsY0FBcUNOLElBQUksQ0FBQ1YsR0FBMUMsY0FBaURlLE9BQU8sQ0FBQ0wsSUFBSSxDQUFDRSxNQUFOLEVBQWMsQ0FBZCxDQUF4RCxjQUE0RUcsT0FBTyxDQUFDSSxJQUFELEVBQU8sQ0FBUCxDQUFuRixnQkFBa0dKLE9BQU8sQ0FBQ00sTUFBRCxFQUFTLENBQVQsQ0FBekcscUJBQStIWCxJQUFJLENBQUNPLEtBQXBJO0VBQ0Q7O0FBRUQsc0JBQWUsVUFBQ0ssTUFBRDtFQUFBLFNBQWEsQ0FDMUIsVUFBQ0MsR0FBRCxFQUFNQyxHQUFOLEVBQVdDLElBQVgsRUFBb0I7RUFDbEIsUUFBTWYsSUFBSSxHQUFHLEVBQWI7RUFDQSxRQUFJLENBQUNhLEdBQUcsQ0FBQ0csR0FBVCxFQUFjLE1BQU0saUJBQU47RUFDZCxRQUFNQSxHQUFHLEdBQUdILEdBQUcsQ0FBQ0csR0FBSixDQUFRQyxLQUFSLENBQWM7RUFDeEJDLE1BQUFBLFNBQVMsRUFBRTtFQURhLEtBQWQsQ0FBWjtFQUlBbEIsSUFBQUEsSUFBSSxDQUFDTyxLQUFMLEdBQWFNLEdBQUcsQ0FBQ04sS0FBakI7RUFDQVAsSUFBQUEsSUFBSSxDQUFDTSxNQUFMLEdBQWNPLEdBQUcsQ0FBQ1AsTUFBbEI7RUFDQSxRQUFJTyxHQUFHLENBQUNNLEVBQVIsRUFBWW5CLElBQUksQ0FBQ00sTUFBTCxHQUFjLElBQWQ7RUFDWk4sSUFBQUEsSUFBSSxDQUFDTCxJQUFMLEdBQVlrQixHQUFHLENBQUNPLE9BQUosQ0FBWXpCLElBQXhCO0VBQ0FLLElBQUFBLElBQUksQ0FBQ1YsR0FBTCxHQUFXLENBQUN1QixHQUFHLENBQUNRLE9BQUosSUFBZSxFQUFoQixLQUF1QlIsR0FBRyxDQUFDdkIsR0FBSixJQUFXLEdBQWxDLENBQVg7RUFDQVUsSUFBQUEsSUFBSSxDQUFDc0IsT0FBTCxHQUFlVCxHQUFHLENBQUNVLE1BQUosQ0FBVyxTQUFYLEtBQXlCVixHQUFHLENBQUNVLE1BQUosQ0FBVyxVQUFYLENBQXhDO0VBQ0F2QixJQUFBQSxJQUFJLENBQUN3QixFQUFMLEdBQVVYLEdBQUcsQ0FBQ1csRUFBSixJQUFVWCxHQUFHLENBQUNZLFVBQUosQ0FBZUMsYUFBekIsSUFDTGIsR0FBRyxDQUFDYyxNQUFKLElBQWNkLEdBQUcsQ0FBQ2MsTUFBSixDQUFXRCxhQURwQixJQUVMYixHQUFHLENBQUNjLE1BQUosQ0FBV0EsTUFBWCxJQUFxQmQsR0FBRyxDQUFDYyxNQUFKLENBQVdBLE1BQVgsQ0FBa0JELGFBRmxDLElBR04sV0FISjs7RUFNQSxRQUFJekMsT0FBSixFQUFhO0VBQ1grQixNQUFBQSxHQUFHLENBQUNZLEtBQUosQ0FBVTVCLElBQVYsRUFBZ0JJLFFBQVEsQ0FBQ0osSUFBRCxDQUF4Qjs7RUFDQSxVQUFJYSxHQUFHLENBQUNnQixJQUFSLEVBQWM7RUFDWmIsUUFBQUEsR0FBRyxDQUFDYyxLQUFKLENBQVVDLElBQUksQ0FBQ0MsU0FBTCxDQUFlbkIsR0FBRyxDQUFDZ0IsSUFBbkIsQ0FBVjtFQUNEO0VBQ0Y7O0VBRUQsUUFBTUksTUFBTSxHQUFHQyxPQUFPLENBQUNELE1BQVIsRUFBZjs7RUFDQSxhQUFTRSxPQUFULEdBQW1CO0VBQ2pCbkMsTUFBQUEsSUFBSSxDQUFDRSxNQUFMLEdBQWNZLEdBQUcsQ0FBQ3NCLFVBQWxCO0VBQ0FwQyxNQUFBQSxJQUFJLENBQUNXLE1BQUwsR0FBY0csR0FBRyxDQUFDdUIsU0FBSixDQUFjLGdCQUFkLENBQWQ7RUFFQSxVQUFNQyxJQUFJLEdBQUdKLE9BQU8sQ0FBQ0QsTUFBUixDQUFlQSxNQUFmLENBQWI7RUFDQWpDLE1BQUFBLElBQUksQ0FBQ0csUUFBTCxHQUFnQm1DLElBQUksQ0FBQyxDQUFELENBQUosR0FBVSxHQUFWLEdBQWdCQSxJQUFJLENBQUMsQ0FBRCxDQUFKLEdBQVUsSUFBMUM7RUFFQXRCLE1BQUFBLEdBQUcsQ0FBQ2pCLE9BQU8sQ0FBQ0MsSUFBRCxDQUFSLENBQUgsQ0FBbUJBLElBQW5CLEVBQXlCUSxTQUFTLENBQUNSLElBQUQsQ0FBbEM7RUFDRDs7RUFDRGMsSUFBQUEsR0FBRyxDQUFDeUIsRUFBSixDQUFPLFFBQVAsRUFBaUJKLE9BQWpCO0VBQ0FyQixJQUFBQSxHQUFHLENBQUN5QixFQUFKLENBQU8sT0FBUCxFQUFnQkosT0FBaEI7RUFDQXBCLElBQUFBLElBQUk7RUFDTCxHQXhDeUIsQ0FBYjtFQUFBLENBQWY7O0FDakJBLG1CQUFlLFVBQUN5QixHQUFEO0VBQUEsU0FBVSxDQUN2QkMsVUFBVSxDQUFDQyxJQUFYLEVBRHVCLEVBRXZCRCxVQUFVLENBQUNFLFVBQVgsQ0FBc0I7RUFBRUMsSUFBQUEsUUFBUSxFQUFFO0VBQVosR0FBdEIsQ0FGdUIsRUFHdkJDLFlBQVksRUFIVyxFQUl2QkMsSUFBSSxFQUptQixDQUFWO0VBQUEsQ0FBZjs7QUNKQSxvQkFBZSxVQUFDTixHQUFEO0VBQUEsU0FDYixVQUFDdkMsR0FBRCxFQUFNWSxHQUFOLEVBQVdDLEdBQVgsRUFBZ0JDLElBQWhCLEVBQXlCO0VBQ3ZCLFFBQUdGLEdBQUcsSUFBSUEsR0FBRyxDQUFDRyxHQUFYLElBQWtCSCxHQUFHLENBQUNHLEdBQUosQ0FBUStCLEtBQTdCLEVBQW1DO0VBQ2pDbEMsTUFBQUEsR0FBRyxDQUFDRyxHQUFKLENBQVErQixLQUFSLENBQWM7RUFDWjlDLFFBQUFBLEdBQUcsRUFBSEEsR0FEWTtFQUVaK0MsUUFBQUEsS0FBSyxFQUFFbkMsR0FBRyxDQUFDbUMsS0FGQztFQUdabkIsUUFBQUEsSUFBSSxFQUFFaEIsR0FBRyxDQUFDZ0IsSUFIRTtFQUlaVCxRQUFBQSxPQUFPLEVBQUVQLEdBQUcsQ0FBQ087RUFKRCxPQUFkLEVBS0csQ0FBQ25CLEdBQUcsSUFBSSxFQUFSLEVBQVlnRCxLQUxmO0VBTUQsS0FQRCxNQU9PO0VBQ0xDLE1BQUFBLE9BQU8sQ0FBQ2xDLEdBQVIsQ0FBWWYsR0FBWjtFQUNEOztFQUNEYSxJQUFBQSxHQUFHLENBQUNaLE1BQUosQ0FBV0QsR0FBRyxDQUFDQyxNQUFKLElBQWMsR0FBekI7RUFDQSxXQUFPWSxHQUFHLENBQUM0QixJQUFKLENBQVMsRUFBVCxDQUFQO0VBQ0EsUUFBSTVCLEdBQUcsQ0FBQ2IsR0FBUixFQUFhLE9BQU9hLEdBQUcsQ0FBQ2IsR0FBSixDQUFRQSxHQUFSLENBQVA7RUFDYixXQUFPYSxHQUFHLENBQUM0QixJQUFKLENBQVN6QyxHQUFULENBQVA7RUFDRCxHQWhCWTtFQUFBLENBQWY7O0FDRUEsZ0JBQWUsVUFBQ1csTUFBRDtFQUFBLFNBQWEsQ0FDMUIsVUFBQ0MsR0FBRCxFQUFNQyxHQUFOLEVBQVdDLElBQVgsRUFBb0I7RUFDbEIsUUFBSTdCLFFBQUosRUFBYztFQUNaMkIsTUFBQUEsR0FBRyxDQUFDTixLQUFKLEdBQVk0QyxJQUFJLENBQUNDLEVBQUwsRUFBWjtFQUNELEtBRkQsTUFFTztFQUNMcEUsTUFBQUEsTUFBTSxDQUFDdUIsS0FBUCxHQUFlLEtBQUt2QixNQUFNLENBQUN1QixLQUFQLElBQWdCLENBQXJCLENBQWY7RUFDQU0sTUFBQUEsR0FBRyxDQUFDTixLQUFKLEdBQVl2QixNQUFNLENBQUN1QixLQUFuQjtFQUNEOztFQUNELFFBQUlLLE1BQU0sQ0FBQ0ksR0FBWCxFQUFnQjtFQUNkSCxNQUFBQSxHQUFHLENBQUNHLEdBQUosR0FBVUosTUFBTSxDQUFDSSxHQUFQLENBQVdDLEtBQVgsQ0FBaUI7RUFDekJWLFFBQUFBLEtBQUssRUFBRU0sR0FBRyxDQUFDTjtFQURjLE9BQWpCLENBQVY7RUFHRDs7RUFDRFEsSUFBQUEsSUFBSTtFQUNMLEdBZHlCLENBQWI7RUFBQSxDQUFmOztBQ0RBLHNCQUFlLFVBQUN5QixHQUFEO0VBQUEsU0FBVSxDQUN2QixVQUFDM0IsR0FBRCxFQUFNQyxHQUFOLEVBQVdDLElBQVgsRUFBb0I7RUFDbEIsUUFBSXlCLEdBQUcsQ0FBQ2EsUUFBUixFQUFrQjtFQUNoQkMsTUFBQUEsQ0FBQyxDQUFDQyxPQUFGLENBQVVmLEdBQUcsQ0FBQ2EsUUFBZCxFQUF3QixVQUFDRyxHQUFELEVBQU1DLEdBQU4sRUFBYztFQUNwQzVDLFFBQUFBLEdBQUcsQ0FBQzRDLEdBQUQsQ0FBSCxHQUFXRCxHQUFHLENBQUNFLElBQUosQ0FBUzdDLEdBQVQsQ0FBWDtFQUNELE9BRkQsRUFEZ0I7RUFLaEI7RUFDQTs7RUFDRDs7RUFDRCxRQUFJMkIsR0FBRyxDQUFDbUIsU0FBUixFQUFtQjtFQUNqQkwsTUFBQUEsQ0FBQyxDQUFDQyxPQUFGLENBQVVmLEdBQUcsQ0FBQ21CLFNBQWQsRUFBeUIsVUFBQ0gsR0FBRCxFQUFNQyxHQUFOLEVBQWM7RUFDckMzQyxRQUFBQSxHQUFHLENBQUMyQyxHQUFELENBQUgsR0FBV0QsR0FBRyxDQUFDRSxJQUFKLENBQVM1QyxHQUFULENBQVg7RUFDRCxPQUZEO0VBR0Q7O0VBQ0RDLElBQUFBLElBQUk7RUFDTCxHQWhCc0IsQ0FBVjtFQUFBLENBQWY7O0VDREE7QUFDQSxFQU1lLDBCQUFVeUIsR0FBVixFQUFlO0VBQzVCLFNBQU87RUFDTG9CLElBQUFBLFlBQVksRUFBRUEsWUFBWSxNQUFaLFNBQWdCQyxTQUFoQixDQURUO0VBRUxDLElBQUFBLFNBQVMsRUFBRUEsU0FBUyxNQUFULFNBQWFELFNBQWIsQ0FGTjtFQUdMRSxJQUFBQSxVQUFVLEVBQUVBLFVBQVUsTUFBVixTQUFjRixTQUFkLENBSFA7RUFJTEcsSUFBQUEsTUFBTSxFQUFFQSxNQUFNLE1BQU4sU0FBVUgsU0FBVixDQUpIO0VBS0xJLElBQUFBLFlBQVksRUFBRUEsWUFBWSxNQUFaLFNBQWdCSixTQUFoQjtFQUxULEdBQVA7RUFPRDs7RUNiRCxJQUFNSyxXQUFXLEdBQUcsSUFBSUMsUUFBUSxDQUFDQyxNQUFiLENBQW9CO0VBQ3RDQyxFQUFBQSxFQUFFLEVBQUU7RUFDRkMsSUFBQUEsSUFBSSxFQUFFQyxNQURKO0VBRUZDLElBQUFBLElBQUksRUFBRTtFQUZKLEdBRGtDO0VBS3RDQyxFQUFBQSxLQUFLLEVBQUU7RUFDTEgsSUFBQUEsSUFBSSxFQUFFQyxNQUREO0VBRUxHLElBQUFBLFFBQVEsRUFBRSxJQUZMO0VBR0xGLElBQUFBLElBQUksRUFBRTtFQUhELEdBTCtCO0VBVXRDRyxFQUFBQSxZQUFZLEVBQUU7RUFDWkwsSUFBQUEsSUFBSSxFQUFFQyxNQURNO0VBRVpHLElBQUFBLFFBQVEsRUFBRSxJQUZFO0VBR1pGLElBQUFBLElBQUksRUFBRTtFQUhNLEdBVndCO0VBZXRDSSxFQUFBQSxNQUFNLEVBQUU7RUFDTk4sSUFBQUEsSUFBSSxFQUFFQyxNQURBO0VBRU5HLElBQUFBLFFBQVEsRUFBRSxJQUZKO0VBR05GLElBQUFBLElBQUksRUFBRTtFQUhBO0VBZjhCLENBQXBCLENBQXBCOztFQ0FBLElBQU1LLFVBQVUsR0FBRyxJQUFJVixRQUFRLENBQUNDLE1BQWIsQ0FBb0I7RUFDckNDLEVBQUFBLEVBQUUsRUFBRTtFQUNGQyxJQUFBQSxJQUFJLEVBQUVDLE1BREo7RUFFRkcsSUFBQUEsUUFBUSxFQUFFLElBRlI7RUFHRkYsSUFBQUEsSUFBSSxFQUFFO0VBSEosR0FEaUM7RUFNckNDLEVBQUFBLEtBQUssRUFBRTtFQUNMSCxJQUFBQSxJQUFJLEVBQUVDLE1BREQ7RUFFTEcsSUFBQUEsUUFBUSxFQUFFLElBRkw7RUFHTEYsSUFBQUEsSUFBSSxFQUFFO0VBSEQsR0FOOEI7RUFXckNNLEVBQUFBLElBQUksRUFBRTtFQUNKUixJQUFBQSxJQUFJLEVBQUVTLE1BREY7RUFFSkwsSUFBQUEsUUFBUSxFQUFFLElBRk47RUFHSkYsSUFBQUEsSUFBSSxFQUFFO0VBSEYsR0FYK0I7RUFnQnJDUSxFQUFBQSxJQUFJLEVBQUU7RUFDSlYsSUFBQUEsSUFBSSxFQUFFQyxNQURGO0VBRUpHLElBQUFBLFFBQVEsRUFBRSxJQUZOO0VBR0pGLElBQUFBLElBQUksRUFBRTtFQUhGO0VBaEIrQixDQUFwQixDQUFuQjs7RUNBQSxJQUFNUyxXQUFXLEdBQUcsSUFBSWQsUUFBUSxDQUFDQyxNQUFiLENBQW9CO0VBQ3RDQyxFQUFBQSxFQUFFLEVBQUU7RUFDRkMsSUFBQUEsSUFBSSxFQUFFQyxNQURKO0VBRUZHLElBQUFBLFFBQVEsRUFBRSxJQUZSO0VBR0ZGLElBQUFBLElBQUksRUFBRTtFQUhKLEdBRGtDO0VBTXRDVSxFQUFBQSxPQUFPLEVBQUU7RUFDUFosSUFBQUEsSUFBSSxFQUFFQyxNQURDO0VBRVBHLElBQUFBLFFBQVEsRUFBRSxJQUZIO0VBR1BGLElBQUFBLElBQUksRUFBRTtFQUhDLEdBTjZCO0VBV3RDQyxFQUFBQSxLQUFLLEVBQUU7RUFDTEgsSUFBQUEsSUFBSSxFQUFFQyxNQUREO0VBRUxHLElBQUFBLFFBQVEsRUFBRSxJQUZMO0VBR0xGLElBQUFBLElBQUksRUFBRTtFQUhELEdBWCtCO0VBZ0J0Q1csRUFBQUEsS0FBSyxFQUFFO0VBQ0xiLElBQUFBLElBQUksRUFBRVMsTUFERDtFQUVMTCxJQUFBQSxRQUFRLEVBQUUsSUFGTDtFQUdMRixJQUFBQSxJQUFJLEVBQUU7RUFIRDtFQWhCK0IsQ0FBcEIsQ0FBcEI7O0VDRUEsSUFBTVksWUFBWSxHQUFHLElBQUlqQixRQUFRLENBQUNDLE1BQWIsQ0FBb0I7RUFDdkNDLEVBQUFBLEVBQUUsRUFBRTtFQUNGQyxJQUFBQSxJQUFJLEVBQUVDLE1BREo7RUFFRkcsSUFBQUEsUUFBUSxFQUFFLElBRlI7RUFHRkYsSUFBQUEsSUFBSSxFQUFFO0VBSEosR0FEbUM7RUFNdkNDLEVBQUFBLEtBQUssRUFBRTtFQUNMSCxJQUFBQSxJQUFJLEVBQUVDLE1BREQ7RUFFTEcsSUFBQUEsUUFBUSxFQUFFLElBRkw7RUFHTEYsSUFBQUEsSUFBSSxFQUFFO0VBSEQsR0FOZ0M7RUFXdkNhLEVBQUFBLE1BQU0sRUFBRSxDQUFDSixXQUFEO0VBWCtCLENBQXBCLENBQXJCOztFQ0FBLElBQU1LLGFBQWEsR0FBR0MsU0FBTyxDQUFDQyxTQUFSLENBQWtCQyxNQUFNLENBQUNDLE9BQXpCLENBQXRCO0VBQ0EsSUFBTUMsVUFBVSxHQUFHSixTQUFPLENBQUNDLFNBQVIsQ0FBa0JDLE1BQU0sQ0FBQ0csSUFBekIsQ0FBbkI7RUFDQSxJQUFNQyxhQUFhLEdBQUdOLFNBQU8sQ0FBQ0MsU0FBUixDQUFrQkMsTUFBTSxDQUFDSyxPQUF6QixDQUF0QjtBQUNBLEFBTUEsY0FBZSxVQUFDdEQsR0FBRCxFQUFTO0VBQ3RCLE1BQUksQ0FBQ0EsR0FBRyxDQUFDeEIsR0FBVCxFQUFjLE1BQU0sTUFBTjtFQUVkLE1BQU0rRSxNQUFNLEdBQUcsSUFBSTVCLFFBQVEsQ0FBQ0MsTUFBYixDQUFvQjtFQUNqQzRCLElBQUFBLEtBQUssRUFBRTtFQUNMMUIsTUFBQUEsSUFBSSxFQUFFQyxNQUREO0VBRUxHLE1BQUFBLFFBQVEsRUFBRSxJQUZMO0VBR0xGLE1BQUFBLElBQUksRUFBRTtFQUhELEtBRDBCO0VBTWpDSCxJQUFBQSxFQUFFLEVBQUU7RUFDRkMsTUFBQUEsSUFBSSxFQUFFQyxNQURKO0VBRUZDLE1BQUFBLElBQUksRUFBRTtFQUZKLEtBTjZCO0VBVWpDeUIsSUFBQUEsUUFBUSxFQUFFO0VBQ1IzQixNQUFBQSxJQUFJLEVBQUVDO0VBREUsS0FWdUI7RUFhakMyQixJQUFBQSxnQkFBZ0IsRUFBRTtFQUNoQjVCLE1BQUFBLElBQUksRUFBRUMsTUFEVTtFQUVoQkMsTUFBQUEsSUFBSSxFQUFFO0VBRlUsS0FiZTtFQWlCakMyQixJQUFBQSxLQUFLLEVBQUUsQ0FBQ0MsV0FBRCxDQWpCMEI7RUFrQmpDQyxJQUFBQSxLQUFLLEVBQUUsQ0FBQ3hCLFVBQUQsQ0FsQjBCO0VBbUJqQ3lCLElBQUFBLFlBQVksRUFBRSxDQUFDbEIsWUFBRDtFQW5CbUIsR0FBcEIsRUFxQlo7RUFDRG1CLElBQUFBLFVBQVUsRUFBRSxNQURYO0VBRURDLElBQUFBLFVBQVUsRUFBRTtFQUZYLEdBckJZLENBQWY7O0VBMEJBVCxFQUFBQSxNQUFNLENBQUNVLE9BQVAsQ0FBZUMsWUFBZixHQUE4QixVQUFVVixLQUFWLEVBQWlCO0VBQzdDLFFBQU1XLEVBQUUsR0FBRyx3SkFBWDtFQUNBLFdBQU9BLEVBQUUsQ0FBQ0MsSUFBSCxDQUFRWixLQUFSLENBQVA7RUFDRCxHQUhEOztFQUlBRCxFQUFBQSxNQUFNLENBQUNVLE9BQVAsQ0FBZUksZ0JBQWYsR0FBa0MsWUFBdUI7RUFBQSxRQUFibEcsTUFBYSx1RUFBSixFQUFJO0VBQ3ZELFdBQU9tRyxJQUFJLENBQUNDLE1BQUwsR0FBY0MsUUFBZCxDQUF1QixFQUF2QixFQUEyQkMsTUFBM0IsQ0FBa0MsQ0FBbEMsRUFBcUN0RyxNQUFyQyxDQUFQO0VBQ0QsR0FGRDs7RUFHQW9GLEVBQUFBLE1BQU0sQ0FBQ21CLE9BQVAsQ0FBZUMsTUFBZixHQUF3QixZQUFZO0VBQ2xDLFdBQU83RCxDQUFDLENBQUM4RCxJQUFGLENBQU8sS0FBS0MsUUFBTCxFQUFQLEVBQXdCLENBQUMsVUFBRCxDQUF4QixDQUFQO0VBQ0QsR0FGRDs7RUFHQXRCLEVBQUFBLE1BQU0sQ0FBQ21CLE9BQVAsQ0FBZUksV0FBZixHQUE2QixVQUFVMUcsTUFBVixFQUFrQjtFQUM3QyxRQUFNMkcsTUFBTSxHQUFHakUsQ0FBQyxDQUFDa0UsSUFBRixDQUFPLEtBQUtILFFBQUwsRUFBUCxFQUF3QixDQUFDLEtBQUQsRUFBUSxPQUFSLEVBQWlCLElBQWpCLENBQXhCLENBQWY7O0VBQ0EsUUFBSSxDQUFDekcsTUFBTCxFQUFhLE9BQU8yRyxNQUFQO0VBQ2IsV0FBT0UsTUFBTSxDQUFDQyxNQUFQLENBQWNILE1BQWQsRUFBc0IzRyxNQUF0QixDQUFQO0VBQ0QsR0FKRDs7RUFLQW1GLEVBQUFBLE1BQU0sQ0FBQ21CLE9BQVAsQ0FBZVMsaUJBQWYsR0FBbUMsVUFBVS9HLE1BQVYsRUFBa0I7RUFDbkQsV0FBT3JCLEdBQUcsQ0FBQ3FJLElBQUosQ0FBUyxLQUFLTixXQUFMLENBQWlCMUcsTUFBakIsQ0FBVCxFQUFtQzRCLEdBQUcsQ0FBQ3FGLE1BQUosQ0FBV3RJLEdBQVgsQ0FBZUMsTUFBbEQsQ0FBUDtFQUNELEdBRkQ7O0VBR0F1RyxFQUFBQSxNQUFNLENBQUNtQixPQUFQLENBQWVZLGNBQWY7RUFBQTtFQUFBO0VBQUE7RUFBQTtFQUFBLDZCQUFnQyxpQkFBZ0I3QixRQUFoQjtFQUFBO0VBQUE7RUFBQTtFQUFBO0VBQUE7RUFBQSxxQkFDakJKLGFBQWEsQ0FBQ0ksUUFBRCxFQUFXLEtBQUtBLFFBQWhCLENBREk7O0VBQUE7RUFBQTs7RUFBQTtFQUFBO0VBQUE7RUFBQTtFQUFBO0VBQUE7RUFBQSxLQUFoQzs7RUFBQTtFQUFBO0VBQUE7RUFBQTs7RUFJQSxNQUFNOEIsZ0JBQWdCLEdBQUcsRUFBekI7RUFDQWhDLEVBQUFBLE1BQU0sQ0FBQ2lDLEdBQVAsQ0FBVyxNQUFYLEVBQW1CLFVBQVVqSCxJQUFWLEVBQWdCO0VBQUE7O0VBQ2pDLFFBQUksQ0FBQyxLQUFLa0gsVUFBTCxDQUFnQixVQUFoQixDQUFMLEVBQWtDLE9BQU9sSCxJQUFJLEVBQVg7RUFDbEMsV0FBT3VFLGFBQWEsQ0FBQ3lDLGdCQUFELENBQWIsQ0FDTkcsSUFETSxDQUNELFVBQUFDLElBQUksRUFBSTtFQUNaeEMsTUFBQUEsVUFBVSxDQUFDLEtBQUksQ0FBQ00sUUFBTixFQUFnQmtDLElBQWhCLENBQVYsQ0FDQ0QsSUFERCxDQUNNLFVBQUF0QyxJQUFJLEVBQUk7RUFDWixRQUFBLEtBQUksQ0FBQ0ssUUFBTCxHQUFnQkwsSUFBaEI7RUFDQTdFLFFBQUFBLElBQUk7RUFDTCxPQUpEO0VBS0QsS0FQTSxXQVFBQSxJQVJBLENBQVA7RUFTRCxHQVhEO0VBYUEsU0FBT29ELFFBQVEsQ0FBQ2lFLEtBQVQsQ0FBZSxNQUFmLEVBQXVCckMsTUFBdkIsQ0FBUDtFQUNELENBbEVEOztFQ1hlLHVCQUFZO0VBQ3pCLFNBQU87RUFDTHNDLElBQUFBLElBQUksRUFBRUEsSUFBSSxNQUFKLFNBQVF4RSxTQUFSO0VBREQsR0FBUDtFQUdEOzs7OztBQ0VELGNBQWUsVUFBQ3JCLEdBQUQsRUFBUztFQUN0QixNQUFNNkYsSUFBSSxHQUFHN0YsR0FBRyxDQUFDOEYsTUFBSixDQUFXRCxJQUF4QjtFQUVBLE1BQU1FLFdBQVcsR0FBRy9GLEdBQUcsQ0FBQ2dHLEtBQUosQ0FBVUMsV0FBOUI7RUFFQSxNQUFNQyxVQUFVLEdBQUcsRUFBbkI7O0VBRUFBLEVBQUFBLFVBQVUsQ0FBQ0MsUUFBWDtFQUFBO0VBQUE7RUFBQTtFQUFBO0VBQUEsNkJBQXNCLGlCQUFnQjlILEdBQWhCLEVBQXFCQyxHQUFyQjtFQUFBO0VBQUE7RUFBQTtFQUFBO0VBQUE7RUFBQSxtQkFDakJELEdBQUcsQ0FBQ2hCLElBRGE7RUFBQTtFQUFBO0VBQUE7O0VBQUE7RUFBQSxxQkFFQ3dJLElBQUksQ0FBQ08sT0FBTCxDQUFhO0VBQUN2RSxnQkFBQUEsRUFBRSxFQUFFeEQsR0FBRyxDQUFDaEIsSUFBSixDQUFTd0U7RUFBZCxlQUFiLENBRkQ7O0VBQUE7RUFFWnhFLGNBQUFBLElBRlk7O0VBQUEsa0JBR2JBLElBSGE7RUFBQTtFQUFBO0VBQUE7O0VBQUEsK0NBR0FpQixHQUFHLENBQUNaLE1BQUosQ0FBVyxHQUFYLEVBQWdCd0MsSUFBaEIsQ0FBcUIsQ0FBQztFQUFDaUcsZ0JBQUFBLFFBQVEsRUFBRSxLQUFYO0VBQWtCRSxnQkFBQUEsT0FBTyxFQUFFO0VBQTNCLGVBQUQsQ0FBckIsQ0FIQTs7RUFBQTtFQUFBLCtDQUlYLENBQUM7RUFDTkYsZ0JBQUFBLFFBQVEsRUFBRSxJQURKO0VBRU5HLGdCQUFBQSxNQUFNLEVBQUUsQ0FGRjtFQUdOdkosZ0JBQUFBLEdBQUcsRUFBRXNCLEdBQUcsQ0FBQ2hCLElBSEg7RUFJTkEsZ0JBQUFBLElBQUksRUFBRUE7RUFKQSxlQUFELENBSlc7O0VBQUE7RUFBQSwrQ0FXYmlCLEdBQUcsQ0FBQ1osTUFBSixDQUFXLEdBQVgsRUFBZ0J3QyxJQUFoQixDQUFxQixDQUFDO0VBQUNpRyxnQkFBQUEsUUFBUSxFQUFFLEtBQVg7RUFBa0JFLGdCQUFBQSxPQUFPLEVBQUU7RUFBM0IsZUFBRCxDQUFyQixDQVhhOztFQUFBO0VBQUE7RUFBQTtFQUFBO0VBQUE7RUFBQTtFQUFBLEtBQXRCOztFQUFBO0VBQUE7RUFBQTtFQUFBOztFQWNBSCxFQUFBQSxVQUFVLENBQUNLLGFBQVgsR0FBMkIsVUFBVWxJLEdBQVYsRUFBZTtFQUN4QyxXQUFPQSxHQUFHLENBQUNnQixJQUFYO0VBQ0QsR0FGRDs7RUFJQTZHLEVBQUFBLFVBQVUsQ0FBQ00sb0JBQVgsR0FBa0MsVUFBU0MsVUFBVCxFQUFxQm5JLEdBQXJCLEVBQTBCO0VBQzFELFFBQUlvSSxLQUFLLEdBQUc7RUFDVkMsTUFBQUEsT0FBTyxFQUFFLEtBREM7RUFFVk4sTUFBQUEsT0FBTyxFQUFFO0VBRkMsS0FBWjs7RUFLQSxRQUFHLENBQUNJLFVBQVUsQ0FBQ0csT0FBZixFQUF3QjtFQUN0QkYsTUFBQUEsS0FBSyxDQUFDQyxPQUFOLEdBQWdCLElBQWhCO0VBQ0FELE1BQUFBLEtBQUssQ0FBQ0wsT0FBTixHQUFnQixDQUFDO0VBQUNRLFFBQUFBLE1BQU0sRUFBRSxLQUFUO0VBQWdCUixRQUFBQSxPQUFPLEVBQUU7RUFBekIsT0FBRCxDQUFoQjtFQUNEOztFQUVELFFBQUcsQ0FBQ0ksVUFBVSxDQUFDakQsS0FBWixJQUFxQixDQUFDaUQsVUFBVSxDQUFDaEQsUUFBcEMsRUFBOEM7RUFDNUNpRCxNQUFBQSxLQUFLLENBQUNDLE9BQU4sR0FBZ0IsSUFBaEI7RUFDQUQsTUFBQUEsS0FBSyxDQUFDTCxPQUFOLEdBQWdCLENBQUM7RUFBQ1EsUUFBQUEsTUFBTSxFQUFFLEtBQVQ7RUFBZ0JSLFFBQUFBLE9BQU8sRUFBRTtFQUF6QixPQUFELENBQWhCO0VBQ0Q7O0VBRUQsV0FBT0ssS0FBUDtFQUNELEdBakJEOztFQW1CQVIsRUFBQUEsVUFBVSxDQUFDWSxlQUFYLEdBQTZCLFVBQVV6SSxHQUFWLEVBQWVDLEdBQWYsRUFBb0I7RUFDL0MsUUFBTUYsTUFBTSxHQUFHQyxHQUFHLENBQUNnQixJQUFuQjs7RUFDQSxRQUFJakIsTUFBTSxDQUFDb0YsS0FBWCxFQUFrQjtFQUNoQixhQUFPO0VBQ0xBLFFBQUFBLEtBQUssRUFBRXBGLE1BQU0sQ0FBQ29GO0VBRFQsT0FBUDtFQUdEOztFQUNELFdBQU9sRixHQUFHLENBQUNaLE1BQUosQ0FBVyxHQUFYLEVBQWdCd0MsSUFBaEIsQ0FBcUIsQ0FBQztFQUFDMkcsTUFBQUEsTUFBTSxFQUFFLEtBQVQ7RUFBZ0JSLE1BQUFBLE9BQU8sRUFBRTtFQUF6QixLQUFELENBQXJCLENBQVA7RUFDRCxHQVJEOztFQVVBSCxFQUFBQSxVQUFVLENBQUNXLE1BQVg7RUFBQTtFQUFBO0VBQUE7RUFBQTtFQUFBLDZCQUFvQixrQkFBZ0J4SSxHQUFoQixFQUFxQkMsR0FBckI7RUFBQTtFQUFBO0VBQUE7RUFBQTtFQUFBO0VBQUE7RUFFVm1JLGNBQUFBLFVBRlUsR0FFR1AsVUFBVSxDQUFDSyxhQUFYLENBQXlCbEksR0FBekIsRUFBOEJDLEdBQTlCLENBRkg7RUFHVm9JLGNBQUFBLEtBSFUsR0FHRlIsVUFBVSxDQUFDTSxvQkFBWCxDQUFnQ0MsVUFBaEMsRUFBNENuSSxHQUE1QyxDQUhFOztFQUFBLG1CQUlab0ksS0FBSyxDQUFDQyxPQUpNO0VBQUE7RUFBQTtFQUFBOztFQUFBLGdEQUtQckksR0FBRyxDQUFDWixNQUFKLENBQVcsR0FBWCxFQUFnQndDLElBQWhCLENBQXFCd0csS0FBSyxDQUFDTCxPQUEzQixDQUxPOztFQUFBO0VBT1ZVLGNBQUFBLFFBUFUsR0FPQ2IsVUFBVSxDQUFDWSxlQUFYLENBQTJCekksR0FBM0IsRUFBZ0NDLEdBQWhDLENBUEQ7RUFBQTtFQUFBLHFCQVNRdUgsSUFBSSxDQUFDTyxPQUFMLENBQWFXLFFBQWIsQ0FUUjs7RUFBQTtFQVNWQyxjQUFBQSxTQVRVOztFQUFBLG1CQVVaQSxTQVZZO0VBQUE7RUFBQTtFQUFBOztFQUFBLGdEQVVNMUksR0FBRyxDQUFDWixNQUFKLENBQVcsR0FBWCxFQUFnQndDLElBQWhCLENBQXFCLENBQUM7RUFBQzJHLGdCQUFBQSxNQUFNLEVBQUUsS0FBVDtFQUFnQlIsZ0JBQUFBLE9BQU8sRUFBRTtFQUF6QixlQUFELENBQXJCLENBVk47O0VBQUE7RUFZVmhKLGNBQUFBLElBWlUsR0FZSCxJQUFJd0ksSUFBSixtQkFDUlksVUFEUTtFQUVYNUUsZ0JBQUFBLEVBQUUsRUFBRW9GLE1BQU0sRUFGQztFQUdYdkQsZ0JBQUFBLGdCQUFnQixFQUFFO0VBSFAsaUJBWkc7RUFBQTtFQUFBLHFCQWtCVnJHLElBQUksQ0FBQzZKLElBQUwsRUFsQlU7O0VBQUE7RUFvQlZDLGNBQUFBLE1BcEJVLEdBb0JELENBQUM7RUFDZE4sZ0JBQUFBLE1BQU0sRUFBRSxJQURNO0VBRWR4SixnQkFBQUEsSUFBSSxFQUFKQSxJQUZjO0VBR2QrSixnQkFBQUEsS0FBSyxFQUFFL0osSUFBSSxDQUFDOEgsaUJBQUw7RUFITyxlQUFELENBcEJDO0VBQUEsZ0RBMEJUN0csR0FBRyxDQUFDNEIsSUFBSixDQUFTaUgsTUFBVCxDQTFCUzs7RUFBQTtFQUFBO0VBQUE7RUE2QmhCekcsY0FBQUEsT0FBTyxDQUFDbEMsR0FBUjtFQTdCZ0IsZ0RBOEJURixHQUFHLENBQUNaLE1BQUosQ0FBVyxHQUFYLEVBQWdCd0MsSUFBaEIsY0E5QlM7O0VBQUE7RUFBQTtFQUFBO0VBQUE7RUFBQTtFQUFBO0VBQUEsS0FBcEI7O0VBQUE7RUFBQTtFQUFBO0VBQUE7O0VBa0NBZ0csRUFBQUEsVUFBVSxDQUFDbUIsTUFBWDtFQUFBO0VBQUE7RUFBQTtFQUFBO0VBQUEsNkJBQW9CLGtCQUFnQmhKLEdBQWhCLEVBQXFCQyxHQUFyQjtFQUFBO0VBQUE7RUFBQTtFQUFBO0VBQUE7RUFDWkYsY0FBQUEsTUFEWSxHQUNIOEgsVUFBVSxDQUFDSyxhQUFYLENBQXlCbEksR0FBekIsRUFBOEJDLEdBQTlCLENBREc7O0VBQUEsa0JBRWJGLE1BQU0sQ0FBQ3FGLFFBRk07RUFBQTtFQUFBO0VBQUE7O0VBQUEsZ0RBRVduRixHQUFHLENBQUNaLE1BQUosQ0FBVyxHQUFYLEVBQWdCd0MsSUFBaEIsQ0FBcUIsQ0FBQztFQUFDb0gsZ0JBQUFBLEtBQUssRUFBRSxLQUFSO0VBQWVqQixnQkFBQUEsT0FBTyxFQUFFO0VBQXhCLGVBQUQsQ0FBckIsQ0FGWDs7RUFBQTtFQUlaVSxjQUFBQSxRQUpZLEdBSURiLFVBQVUsQ0FBQ1ksZUFBWCxDQUEyQnpJLEdBQTNCLENBSkM7RUFBQTtFQUFBLHFCQUtDd0gsSUFBSSxDQUFDTyxPQUFMLENBQWFXLFFBQWIsQ0FMRDs7RUFBQTtFQUtaMUosY0FBQUEsSUFMWTs7RUFBQSxrQkFPYkEsSUFQYTtFQUFBO0VBQUE7RUFBQTs7RUFBQSxnREFPQWlCLEdBQUcsQ0FBQ1osTUFBSixDQUFXLEdBQVgsRUFBZ0J3QyxJQUFoQixDQUFxQixDQUFDO0VBQUNvSCxnQkFBQUEsS0FBSyxFQUFFLEtBQVI7RUFBZWpCLGdCQUFBQSxPQUFPLEVBQUU7RUFBeEIsZUFBRCxDQUFyQixDQVBBOztFQUFBO0VBQUE7RUFBQSxxQkFRWmhKLElBQUksQ0FBQzZKLElBQUwsRUFSWTs7RUFBQTtFQUFBO0VBQUEscUJBVVA3SixJQUFJLENBQUNpSSxjQUFMLENBQW9CbEgsTUFBTSxDQUFDcUYsUUFBM0IsQ0FWTzs7RUFBQTtFQUFBO0VBQUE7RUFBQTtFQUFBOztFQUFBLGdEQVdUbkYsR0FBRyxDQUFDWixNQUFKLENBQVcsR0FBWCxFQUFnQndDLElBQWhCLENBQXFCLENBQUM7RUFBQ29ILGdCQUFBQSxLQUFLLEVBQUUsS0FBUjtFQUFlakIsZ0JBQUFBLE9BQU8sRUFBRTtFQUF4QixlQUFELENBQXJCLENBWFM7O0VBQUE7RUFBQSxnREFjWC9ILEdBQUcsQ0FBQzRCLElBQUosQ0FBUyxDQUFDO0VBQ2ZvRyxnQkFBQUEsTUFBTSxFQUFFLENBRE87RUFFZmdCLGdCQUFBQSxLQUFLLEVBQUUsSUFGUTtFQUdmakssZ0JBQUFBLElBQUksRUFBSkEsSUFIZTtFQUlmK0osZ0JBQUFBLEtBQUssRUFBRS9KLElBQUksQ0FBQzhILGlCQUFMO0VBSlEsZUFBRCxDQUFULENBZFc7O0VBQUE7RUFBQTtFQUFBO0VBQUE7RUFBQTtFQUFBO0VBQUEsS0FBcEI7O0VBQUE7RUFBQTtFQUFBO0VBQUE7O0VBc0JBZSxFQUFBQSxVQUFVLENBQUNxQixNQUFYO0VBQUE7RUFBQTtFQUFBO0VBQUE7RUFBQSw2QkFBb0Isa0JBQWdCbEosR0FBaEIsRUFBcUJDLEdBQXJCO0VBQUE7RUFBQTtFQUFBO0VBQUE7RUFBQTtFQUNaRixjQUFBQSxNQURZLEdBQ0g4SCxVQUFVLENBQUNLLGFBQVgsQ0FBeUJsSSxHQUF6QixFQUE4QkMsR0FBOUIsQ0FERzs7RUFBQSxrQkFHYkYsTUFBTSxDQUFDb0YsS0FITTtFQUFBO0VBQUE7RUFBQTs7RUFBQSxnREFHUWxGLEdBQUcsQ0FBQ1osTUFBSixDQUFXLEdBQVgsRUFBZ0J3QyxJQUFoQixDQUFxQixDQUFDO0VBQUVxSCxnQkFBQUEsTUFBTSxFQUFFLEtBQVY7RUFBaUJsQixnQkFBQUEsT0FBTyxFQUFFO0VBQTFCLGVBQUQsQ0FBckIsQ0FIUjs7RUFBQTtFQUtaVSxjQUFBQSxRQUxZLEdBS0RiLFVBQVUsQ0FBQ1ksZUFBWCxDQUEyQnpJLEdBQTNCLENBTEM7RUFBQTtFQUFBLHFCQU1Dd0gsSUFBSSxDQUFDTyxPQUFMLENBQWFXLFFBQWIsQ0FORDs7RUFBQTtFQU1aMUosY0FBQUEsSUFOWTs7RUFBQSxrQkFRYkEsSUFSYTtFQUFBO0VBQUE7RUFBQTs7RUFBQSxnREFRQWlCLEdBQUcsQ0FBQ1osTUFBSixDQUFXLEdBQVgsRUFBZ0J3QyxJQUFoQixDQUFxQixDQUFDO0VBQUNvSCxnQkFBQUEsS0FBSyxFQUFFLEtBQVI7RUFBZWpCLGdCQUFBQSxPQUFPLEVBQUU7RUFBeEIsZUFBRCxDQUFyQixDQVJBOztFQUFBO0VBQUE7RUFBQSxxQkFVRW1CLE1BQU0sQ0FBQ0MsV0FBUCxDQUFtQixFQUFuQixDQVZGOztFQUFBO0VBVVpMLGNBQUFBLEtBVlk7RUFZbEIvSixjQUFBQSxJQUFJLENBQUNxRyxnQkFBTCxHQUF3QjBELEtBQUssQ0FBQzVDLFFBQU4sQ0FBZSxLQUFmLENBQXhCO0VBWmtCO0VBQUEscUJBYVpuSCxJQUFJLENBQUM2SixJQUFMLEVBYlk7O0VBQUE7RUFnQmRRLGNBQUFBLE9BaEJjLEdBZ0JKLHdCQWhCSTs7RUFpQmxCLGtCQUFJaEwsUUFBSixFQUFjO0VBQ1pnTCxnQkFBQUEsT0FBTyxHQUFHLHVCQUFWO0VBQ0Q7O0VBRUdDLGNBQUFBLFFBckJjLDJPQXFCMENELE9BckIxQyx5QkFxQmdFckssSUFBSSxDQUFDcUcsZ0JBckJyRTtFQXVCZGtFLGNBQUFBLFdBdkJjLEdBdUJBO0VBQ2hCQyxnQkFBQUEsSUFBSSxFQUFFLHVCQURVO0VBRWhCQyxnQkFBQUEsRUFBRSxFQUFFekssSUFBSSxDQUFDbUcsS0FGTztFQUdoQnVFLGdCQUFBQSxPQUFPLEVBQUUsdUNBSE87RUFJaEJ2RixnQkFBQUEsSUFBSSxFQUFFbUY7RUFKVSxlQXZCQTtFQUFBO0VBQUEscUJBNkJaNUIsV0FBVyxDQUFDaUMsUUFBWixDQUFxQkosV0FBckIsQ0E3Qlk7O0VBQUE7RUErQlpULGNBQUFBLE1BL0JZLEdBK0JILENBQUM7RUFDZGIsZ0JBQUFBLE1BQU0sRUFBRSxDQURNO0VBRWRpQixnQkFBQUEsTUFBTSxFQUFFO0VBRk0sZUFBRCxDQS9CRztFQUFBLGdEQW1DWGpKLEdBQUcsQ0FBQzRCLElBQUosQ0FBU2lILE1BQVQsQ0FuQ1c7O0VBQUE7RUFBQTtFQUFBO0VBQUE7RUFBQTtFQUFBO0VBQUEsS0FBcEI7O0VBQUE7RUFBQTtFQUFBO0VBQUE7O0VBc0NBakIsRUFBQUEsVUFBVSxDQUFDK0IsZ0JBQVg7RUFBQTtFQUFBO0VBQUE7RUFBQTtFQUFBLDZCQUE4QixrQkFBZ0I1SixHQUFoQixFQUFxQkMsR0FBckI7RUFBQTtFQUFBO0VBQUE7RUFBQTtFQUFBO0VBQ3BCb0YsY0FBQUEsZ0JBRG9CLEdBQ0NyRixHQUFHLENBQUNELE1BREwsQ0FDcEJzRixnQkFEb0I7O0VBQUEsa0JBR3ZCQSxnQkFIdUI7RUFBQTtFQUFBO0VBQUE7O0VBQUEsZ0RBSW5CcEYsR0FBRyxDQUFDWixNQUFKLENBQVcsR0FBWCxFQUFnQndDLElBQWhCLENBQXFCLENBQUM7RUFBQytILGdCQUFBQSxnQkFBZ0IsRUFBRSxLQUFuQjtFQUEwQjVCLGdCQUFBQSxPQUFPLEVBQUU7RUFBbkMsZUFBRCxDQUFyQixDQUptQjs7RUFBQTtFQU90QlUsY0FBQUEsUUFQc0IsR0FPWDtFQUFFckQsZ0JBQUFBLGdCQUFnQixFQUFoQkE7RUFBRixlQVBXO0VBQUE7RUFBQSxxQkFRVG1DLElBQUksQ0FBQ08sT0FBTCxDQUFhVyxRQUFiLENBUlM7O0VBQUE7RUFRdEIxSixjQUFBQSxJQVJzQjs7RUFBQSxrQkFVdkJBLElBVnVCO0VBQUE7RUFBQTtFQUFBOztFQUFBLGdEQVVWaUIsR0FBRyxDQUFDWixNQUFKLENBQVcsR0FBWCxFQUFnQndDLElBQWhCLENBQXFCLENBQUM7RUFBQytILGdCQUFBQSxnQkFBZ0IsRUFBRSxLQUFuQjtFQUEwQjVCLGdCQUFBQSxPQUFPLEVBQUU7RUFBbkMsZUFBRCxDQUFyQixDQVZVOztFQUFBO0VBQUEsZ0RBWXJCL0gsR0FBRyxDQUFDNEIsSUFBSixDQUFTLENBQUM7RUFDYm9HLGdCQUFBQSxNQUFNLEVBQUUsQ0FESztFQUViMkIsZ0JBQUFBLGdCQUFnQixFQUFFO0VBRkwsZUFBRCxDQUFULENBWnFCOztFQUFBO0VBQUE7RUFBQTtFQUFBO0VBQUE7RUFBQTtFQUFBLEtBQTlCOztFQUFBO0VBQUE7RUFBQTtFQUFBOztFQWtCQS9CLEVBQUFBLFVBQVUsQ0FBQ2dDLEtBQVg7RUFBQTtFQUFBO0VBQUE7RUFBQTtFQUFBLDZCQUFtQixrQkFBZ0I3SixHQUFoQixFQUFxQkMsR0FBckI7RUFBQTtFQUFBO0VBQUE7RUFBQTtFQUFBO0VBQ1hGLGNBQUFBLE1BRFcsR0FDRjhILFVBQVUsQ0FBQ0ssYUFBWCxDQUF5QmxJLEdBQXpCLEVBQThCQyxHQUE5QixDQURFO0VBRVRtRixjQUFBQSxRQUZTLEdBRXNDckYsTUFGdEMsQ0FFVHFGLFFBRlMsRUFFQzBFLGFBRkQsR0FFc0MvSixNQUZ0QyxDQUVDK0osYUFGRCxFQUVnQnpFLGdCQUZoQixHQUVzQ3RGLE1BRnRDLENBRWdCc0YsZ0JBRmhCOztFQUFBLGtCQUlaRCxRQUpZO0VBQUE7RUFBQTtFQUFBOztFQUFBLGdEQUlLbkYsR0FBRyxDQUFDWixNQUFKLENBQVcsR0FBWCxFQUFnQndDLElBQWhCLENBQXFCLENBQUM7RUFBQ2dJLGdCQUFBQSxLQUFLLEVBQUUsS0FBUjtFQUFlN0IsZ0JBQUFBLE9BQU8sRUFBRTtFQUF4QixlQUFELENBQXJCLENBSkw7O0VBQUE7RUFBQSxrQkFLWjhCLGFBTFk7RUFBQTtFQUFBO0VBQUE7O0VBQUEsZ0RBS1U3SixHQUFHLENBQUNaLE1BQUosQ0FBVyxHQUFYLEVBQWdCd0MsSUFBaEIsQ0FBcUIsQ0FBQztFQUFDZ0ksZ0JBQUFBLEtBQUssRUFBRSxLQUFSO0VBQWU3QixnQkFBQUEsT0FBTyxFQUFFO0VBQXhCLGVBQUQsQ0FBckIsQ0FMVjs7RUFBQTtFQUFBLG9CQU1iNUMsUUFBUSxLQUFLMEUsYUFOQTtFQUFBO0VBQUE7RUFBQTs7RUFBQSxnREFNc0I3SixHQUFHLENBQUNaLE1BQUosQ0FBVyxHQUFYLEVBQWdCd0MsSUFBaEIsQ0FBcUIsQ0FBQztFQUFDZ0ksZ0JBQUFBLEtBQUssRUFBRSxLQUFSO0VBQWU3QixnQkFBQUEsT0FBTyxFQUFFO0VBQXhCLGVBQUQsQ0FBckIsQ0FOdEI7O0VBQUE7RUFBQSxrQkFPWjNDLGdCQVBZO0VBQUE7RUFBQTtFQUFBOztFQUFBLGdEQU9hcEYsR0FBRyxDQUFDWixNQUFKLENBQVcsR0FBWCxFQUFnQndDLElBQWhCLENBQXFCLENBQUM7RUFBQ2dJLGdCQUFBQSxLQUFLLEVBQUUsS0FBUjtFQUFlN0IsZ0JBQUFBLE9BQU8sRUFBRTtFQUF4QixlQUFELENBQXJCLENBUGI7O0VBQUE7RUFTWFUsY0FBQUEsUUFUVyxHQVNBO0VBQUVyRCxnQkFBQUEsZ0JBQWdCLEVBQWhCQTtFQUFGLGVBVEE7RUFBQTtFQUFBLHFCQVVFbUMsSUFBSSxDQUFDTyxPQUFMLENBQWFXLFFBQWIsQ0FWRjs7RUFBQTtFQVVYMUosY0FBQUEsSUFWVzs7RUFBQSxrQkFXWkEsSUFYWTtFQUFBO0VBQUE7RUFBQTs7RUFBQSxnREFXQ2lCLEdBQUcsQ0FBQ1osTUFBSixDQUFXLEdBQVgsRUFBZ0J3QyxJQUFoQixDQUFxQixDQUFDO0VBQUNnSSxnQkFBQUEsS0FBSyxFQUFFLEtBQVI7RUFBZTdCLGdCQUFBQSxPQUFPLEVBQUU7RUFBeEIsZUFBRCxDQUFyQixDQVhEOztFQUFBO0VBWWpCaEosY0FBQUEsSUFBSSxDQUFDcUcsZ0JBQUwsR0FBd0IsRUFBeEI7RUFDQXJHLGNBQUFBLElBQUksQ0FBQ29HLFFBQUwsR0FBZ0JBLFFBQWhCO0VBYmlCO0VBQUEscUJBZVhwRyxJQUFJLENBQUM2SixJQUFMLEVBZlc7O0VBQUE7RUFBQSxnREFpQlY1SSxHQUFHLENBQUM0QixJQUFKLENBQVMsQ0FBQztFQUNmb0csZ0JBQUFBLE1BQU0sRUFBRSxDQURPO0VBRWY0QixnQkFBQUEsS0FBSyxFQUFFO0VBRlEsZUFBRCxDQUFULENBakJVOztFQUFBO0VBQUE7RUFBQTtFQUFBO0VBQUE7RUFBQTtFQUFBLEtBQW5COztFQUFBO0VBQUE7RUFBQTtFQUFBOztFQXVCQWhDLEVBQUFBLFVBQVUsQ0FBQ2tDLFFBQVgsR0FBc0IsVUFBVS9KLEdBQVYsRUFBZTtFQUNuQyxRQUFJQSxHQUFHLENBQUNPLE9BQUosQ0FBWXlKLGFBQVosSUFBNkJoSyxHQUFHLENBQUNPLE9BQUosQ0FBWXlKLGFBQVosQ0FBMEJDLEtBQTFCLENBQWlDLEdBQWpDLEVBQXdDLENBQXhDLE1BQWdELFFBQWpGLEVBQTJGO0VBQ3pGLGFBQU9qSyxHQUFHLENBQUNPLE9BQUosQ0FBWXlKLGFBQVosQ0FBMEJDLEtBQTFCLENBQWlDLEdBQWpDLEVBQXdDLENBQXhDLENBQVA7RUFDRCxLQUZELE1BRU8sSUFBSWpLLEdBQUcsQ0FBQ08sT0FBSixDQUFZLGdCQUFaLENBQUosRUFBbUM7RUFDeEMsYUFBT1AsR0FBRyxDQUFDTyxPQUFKLENBQVksZ0JBQVosQ0FBUDtFQUNELEtBRk0sTUFFQSxJQUFLUCxHQUFHLENBQUNtQyxLQUFKLElBQWFuQyxHQUFHLENBQUNtQyxLQUFKLENBQVU0RyxLQUE1QixFQUFvQztFQUN6QyxhQUFPL0ksR0FBRyxDQUFDbUMsS0FBSixDQUFVNEcsS0FBakI7RUFDRCxLQUZNLE1BRUEsSUFBSy9JLEdBQUcsQ0FBQ2tLLE9BQUosSUFBZWxLLEdBQUcsQ0FBQ2tLLE9BQUosQ0FBWW5CLEtBQWhDLEVBQXlDO0VBQzlDLGFBQU8vSSxHQUFHLENBQUNrSyxPQUFKLENBQVluQixLQUFuQjtFQUNEOztFQUNELFFBQUkzSyxPQUFPLElBQUl1RCxHQUFHLENBQUNxRixNQUFmLElBQXlCckYsR0FBRyxDQUFDcUYsTUFBSixDQUFXdEksR0FBcEMsSUFBMkNpRCxHQUFHLENBQUNxRixNQUFKLENBQVd0SSxHQUFYLENBQWV5TCxRQUE5RCxFQUF3RSxPQUFPeEksR0FBRyxDQUFDcUYsTUFBSixDQUFXdEksR0FBWCxDQUFleUwsUUFBdEI7RUFDeEUsV0FBTyxJQUFQO0VBQ0QsR0FaRDs7RUFjQXRDLEVBQUFBLFVBQVUsQ0FBQ3VDLFVBQVgsR0FBd0IsVUFBVXBLLEdBQVYsRUFBZUMsR0FBZixFQUFvQkMsSUFBcEIsRUFBMEI7RUFDaEQsUUFBTTZJLEtBQUssR0FBR2xCLFVBQVUsQ0FBQ2tDLFFBQVgsQ0FBb0IvSixHQUFwQixDQUFkO0VBQ0FBLElBQUFBLEdBQUcsQ0FBQytJLEtBQUosR0FBWUEsS0FBWjtFQUNBN0ksSUFBQUEsSUFBSTtFQUNMLEdBSkQ7O0VBTUEySCxFQUFBQSxVQUFVLENBQUN3QyxTQUFYLEdBQXVCLFVBQVVySyxHQUFWLEVBQWVDLEdBQWYsRUFBb0JDLElBQXBCLEVBQTBCO0VBQy9DLFFBQU1vSyxPQUFPLEdBQUc7RUFDZDNMLE1BQUFBLE1BQU0sRUFBRWdELEdBQUcsQ0FBQ3FGLE1BQUosSUFBY3JGLEdBQUcsQ0FBQ3FGLE1BQUosQ0FBV3RJLEdBQVgsQ0FBZUMsTUFBN0IsSUFBdUMsUUFEakM7RUFFZG9MLE1BQUFBLFFBQVEsRUFBRSxrQkFBQS9KLEdBQUc7RUFBQSxlQUFJQSxHQUFHLENBQUMrSSxLQUFSO0VBQUE7RUFGQyxLQUFoQjtFQUlBckssSUFBQUEsS0FBRyxDQUFDNEwsT0FBRCxDQUFILENBQWF0SyxHQUFiLEVBQWtCQyxHQUFsQixFQUF1QixVQUFDYixHQUFELEVBQVM7RUFDOUIsVUFBSUEsR0FBSixFQUFTWSxHQUFHLENBQUN1SyxPQUFKLEdBQWNuTCxHQUFkO0VBQ1RjLE1BQUFBLElBQUk7RUFDTCxLQUhEO0VBSUQsR0FURDs7RUFXQTJILEVBQUFBLFVBQVUsQ0FBQzJDLE1BQVgsR0FBb0IsVUFBVXhLLEdBQVYsRUFBZUMsR0FBZixFQUFvQkMsSUFBcEIsRUFBMEI7RUFDNUMsUUFBSUYsR0FBRyxDQUFDdUssT0FBUixFQUFpQixPQUFPckssSUFBSSxDQUFDRixHQUFHLENBQUN1SyxPQUFMLENBQVg7RUFDakIsUUFBSSxDQUFDdkssR0FBRyxDQUFDaEIsSUFBTCxJQUFhLENBQUNnQixHQUFHLENBQUNoQixJQUFKLENBQVN5TCxHQUEzQixFQUFnQyxPQUFPeEssR0FBRyxDQUFDWixNQUFKLENBQVcsR0FBWCxFQUFnQnFMLElBQWhCLENBQXFCLFdBQXJCLENBQVA7RUFDaEN4SyxJQUFBQSxJQUFJO0VBQ0wsR0FKRDs7RUFNQSxTQUFPMkgsVUFBUDtFQUNELENBbk9EOztBQ05BLGdCQUFlLFVBQUNsRyxHQUFELEVBQVM7RUFDdEIsTUFBTTZGLElBQUksR0FBRzdGLEdBQUcsQ0FBQzhGLE1BQUosQ0FBV0QsSUFBeEI7RUFFQSxNQUFJSyxVQUFVLEdBQUcsRUFBakI7O0VBRUFBLEVBQUFBLFVBQVUsQ0FBQzhDLEdBQVg7RUFBQTtFQUFBO0VBQUE7RUFBQTtFQUFBLDZCQUFpQixpQkFBZTNLLEdBQWYsRUFBb0JDLEdBQXBCO0VBQUE7RUFBQTtFQUFBO0VBQUE7RUFBQTtFQUNUMkssY0FBQUEsTUFEUyxHQUNBNUssR0FBRyxDQUFDaEIsSUFBSixDQUFTd0UsRUFEVDtFQUFBO0VBQUEscUJBRUlnRSxJQUFJLENBQUNPLE9BQUwsQ0FBYTtFQUFDdkUsZ0JBQUFBLEVBQUUsRUFBRW9IO0VBQUwsZUFBYixDQUZKOztFQUFBO0VBRVQ1TCxjQUFBQSxJQUZTO0VBQUEsK0NBSVJpQixHQUFHLENBQUM0QixJQUFKLENBQVM3QyxJQUFULENBSlE7O0VBQUE7RUFBQTtFQUFBO0VBQUE7RUFBQTtFQUFBO0VBQUEsS0FBakI7O0VBQUE7RUFBQTtFQUFBO0VBQUE7O0VBT0E2SSxFQUFBQSxVQUFVLENBQUNnRCxRQUFYO0VBQUE7RUFBQTtFQUFBO0VBQUE7RUFBQSw2QkFBc0Isa0JBQWU3SyxHQUFmLEVBQW9CQyxHQUFwQjtFQUFBO0VBQUE7RUFBQTtFQUFBO0VBQUE7RUFDZDJLLGNBQUFBLE1BRGMsR0FDTDVLLEdBQUcsQ0FBQ0QsTUFBSixDQUFXeUQsRUFETjtFQUFBO0VBQUEscUJBRURnRSxJQUFJLENBQUNPLE9BQUwsQ0FBYTtFQUFFdkUsZ0JBQUFBLEVBQUUsRUFBRW9IO0VBQU4sZUFBYixDQUZDOztFQUFBO0VBRWQ1TCxjQUFBQSxJQUZjO0VBQUEsZ0RBSWJpQixHQUFHLENBQUM0QixJQUFKLENBQVM3QyxJQUFJLENBQUNzRyxLQUFkLENBSmE7O0VBQUE7RUFBQTtFQUFBO0VBQUE7RUFBQTtFQUFBO0VBQUEsS0FBdEI7O0VBQUE7RUFBQTtFQUFBO0VBQUE7O0VBT0F1QyxFQUFBQSxVQUFVLENBQUNpRCxPQUFYO0VBQUE7RUFBQTtFQUFBO0VBQUE7RUFBQSw2QkFBcUIsa0JBQWU5SyxHQUFmLEVBQW9CQyxHQUFwQjtFQUFBO0VBQUE7RUFBQTtFQUFBO0VBQUE7RUFDYkYsY0FBQUEsTUFEYSxHQUNKQyxHQUFHLENBQUNnQixJQURBOztFQUFBLGtCQUVkakIsTUFBTSxDQUFDNkQsS0FGTztFQUFBO0VBQUE7RUFBQTs7RUFBQSxnREFHVjNELEdBQUcsQ0FBQ1osTUFBSixDQUFXLEdBQVgsRUFBZ0J3QyxJQUFoQixDQUFxQixDQUFDO0VBQUMyRyxnQkFBQUEsTUFBTSxFQUFFLEtBQVQ7RUFBZ0JSLGdCQUFBQSxPQUFPLEVBQUU7RUFBekIsZUFBRCxDQUFyQixDQUhVOztFQUFBO0VBQUEsa0JBS2RqSSxNQUFNLENBQUMrRCxZQUxPO0VBQUE7RUFBQTtFQUFBOztFQUFBLGdEQU1WN0QsR0FBRyxDQUFDWixNQUFKLENBQVcsR0FBWCxFQUFnQndDLElBQWhCLENBQXFCLENBQUM7RUFBQzJHLGdCQUFBQSxNQUFNLEVBQUUsS0FBVDtFQUFnQlIsZ0JBQUFBLE9BQU8sRUFBRTtFQUF6QixlQUFELENBQXJCLENBTlU7O0VBQUE7RUFBQSxrQkFRZGpJLE1BQU0sQ0FBQ2dFLE1BUk87RUFBQTtFQUFBO0VBQUE7O0VBQUEsZ0RBU1Y5RCxHQUFHLENBQUNaLE1BQUosQ0FBVyxHQUFYLEVBQWdCd0MsSUFBaEIsQ0FBcUIsQ0FBQztFQUFDMkcsZ0JBQUFBLE1BQU0sRUFBRSxLQUFUO0VBQWdCUixnQkFBQUEsT0FBTyxFQUFFO0VBQXpCLGVBQUQsQ0FBckIsQ0FUVTs7RUFBQTtFQVlYcEUsY0FBQUEsS0FaVyxHQVlzQjdELE1BWnRCLENBWVg2RCxLQVpXLEVBWUpFLFlBWkksR0FZc0IvRCxNQVp0QixDQVlKK0QsWUFaSSxFQVlVQyxNQVpWLEdBWXNCaEUsTUFadEIsQ0FZVWdFLE1BWlY7RUFjYjZHLGNBQUFBLE1BZGEsR0FjSjVLLEdBQUcsQ0FBQ2hCLElBQUosQ0FBU3dFLEVBZEw7RUFBQTtFQUFBLHFCQWVBZ0UsSUFBSSxDQUFDTyxPQUFMLENBQWE7RUFBQ3ZFLGdCQUFBQSxFQUFFLEVBQUVvSDtFQUFMLGVBQWIsQ0FmQTs7RUFBQTtFQWViNUwsY0FBQUEsSUFmYTtFQWlCYitMLGNBQUFBLElBakJhLEdBaUJOO0VBQ1h2SCxnQkFBQUEsRUFBRSxFQUFFb0YsTUFBTSxFQURDO0VBRVhoRixnQkFBQUEsS0FBSyxFQUFMQSxLQUZXO0VBR1hFLGdCQUFBQSxZQUFZLEVBQVpBLFlBSFc7RUFJWEMsZ0JBQUFBLE1BQU0sRUFBTkE7RUFKVyxlQWpCTTtFQXdCbkIvRSxjQUFBQSxJQUFJLENBQUNzRyxLQUFMLENBQVcwRixJQUFYLENBQWdCRCxJQUFoQjtFQXhCbUI7RUFBQSxxQkF5QmIvTCxJQUFJLENBQUM2SixJQUFMLEVBekJhOztFQUFBO0VBQUEsZ0RBMkJaNUksR0FBRyxDQUFDNEIsSUFBSixDQUFTLENBQUM7RUFBRW9KLGdCQUFBQSxJQUFJLEVBQUUsSUFBUjtFQUFjakQsZ0JBQUFBLE9BQU8sRUFBRTtFQUF2QixlQUFELENBQVQsQ0EzQlk7O0VBQUE7RUFBQTtFQUFBO0VBQUE7RUFBQTtFQUFBO0VBQUEsS0FBckI7O0VBQUE7RUFBQTtFQUFBO0VBQUE7O0VBK0JBSCxFQUFBQSxVQUFVLENBQUNxRCxRQUFYO0VBQUE7RUFBQTtFQUFBO0VBQUE7RUFBQSw2QkFBc0Isa0JBQWVsTCxHQUFmLEVBQW9CQyxHQUFwQjtFQUFBO0VBQUE7RUFBQTtFQUFBO0VBQUE7RUFDZDJLLGNBQUFBLE1BRGMsR0FDTDVLLEdBQUcsQ0FBQ0QsTUFBSixDQUFXeUQsRUFETjtFQUFBO0VBQUEscUJBRURnRSxJQUFJLENBQUNPLE9BQUwsQ0FBYTtFQUFFdkUsZ0JBQUFBLEVBQUUsRUFBRW9IO0VBQU4sZUFBYixDQUZDOztFQUFBO0VBRWQ1TCxjQUFBQSxJQUZjO0VBQUEsZ0RBSWJpQixHQUFHLENBQUM0QixJQUFKLENBQVM3QyxJQUFJLENBQUN3RyxLQUFkLENBSmE7O0VBQUE7RUFBQTtFQUFBO0VBQUE7RUFBQTtFQUFBO0VBQUEsS0FBdEI7O0VBQUE7RUFBQTtFQUFBO0VBQUE7O0VBT0FxQyxFQUFBQSxVQUFVLENBQUNzRCxPQUFYO0VBQUE7RUFBQTtFQUFBO0VBQUE7RUFBQSw2QkFBcUIsa0JBQWVuTCxHQUFmLEVBQW9CQyxHQUFwQjtFQUFBO0VBQUE7RUFBQTtFQUFBO0VBQUE7RUFDYkYsY0FBQUEsTUFEYSxHQUNKQyxHQUFHLENBQUNnQixJQURBOztFQUFBLGtCQUVkakIsTUFBTSxDQUFDNkQsS0FGTztFQUFBO0VBQUE7RUFBQTs7RUFBQSxnREFHVjNELEdBQUcsQ0FBQ1osTUFBSixDQUFXLEdBQVgsRUFBZ0J3QyxJQUFoQixDQUFxQixDQUFDO0VBQUMyRyxnQkFBQUEsTUFBTSxFQUFFLEtBQVQ7RUFBZ0JSLGdCQUFBQSxPQUFPLEVBQUU7RUFBekIsZUFBRCxDQUFyQixDQUhVOztFQUFBO0VBQUEsa0JBS2RqSSxNQUFNLENBQUNrRSxJQUxPO0VBQUE7RUFBQTtFQUFBOztFQUFBLGdEQU1WaEUsR0FBRyxDQUFDWixNQUFKLENBQVcsR0FBWCxFQUFnQndDLElBQWhCLENBQXFCLENBQUM7RUFBQzJHLGdCQUFBQSxNQUFNLEVBQUUsS0FBVDtFQUFnQlIsZ0JBQUFBLE9BQU8sRUFBRTtFQUF6QixlQUFELENBQXJCLENBTlU7O0VBQUE7RUFBQSxrQkFRZGpJLE1BQU0sQ0FBQ29FLElBUk87RUFBQTtFQUFBO0VBQUE7O0VBQUEsZ0RBU1ZsRSxHQUFHLENBQUNaLE1BQUosQ0FBVyxHQUFYLEVBQWdCd0MsSUFBaEIsQ0FBcUIsQ0FBQztFQUFDMkcsZ0JBQUFBLE1BQU0sRUFBRSxLQUFUO0VBQWdCUixnQkFBQUEsT0FBTyxFQUFFO0VBQXpCLGVBQUQsQ0FBckIsQ0FUVTs7RUFBQTtFQVlYcEUsY0FBQUEsS0FaVyxHQVlZN0QsTUFaWixDQVlYNkQsS0FaVyxFQVlKSyxJQVpJLEdBWVlsRSxNQVpaLENBWUprRSxJQVpJLEVBWUVFLElBWkYsR0FZWXBFLE1BWlosQ0FZRW9FLElBWkY7RUFjYnlHLGNBQUFBLE1BZGEsR0FjSjVLLEdBQUcsQ0FBQ2hCLElBQUosQ0FBU3dFLEVBZEw7RUFBQTtFQUFBLHFCQWVBZ0UsSUFBSSxDQUFDTyxPQUFMLENBQWE7RUFBQ3ZFLGdCQUFBQSxFQUFFLEVBQUVvSDtFQUFMLGVBQWIsQ0FmQTs7RUFBQTtFQWViNUwsY0FBQUEsSUFmYTtFQWlCYm9NLGNBQUFBLElBakJhLEdBaUJOO0VBQ1g1SCxnQkFBQUEsRUFBRSxFQUFFb0YsTUFBTSxFQURDO0VBRVhoRixnQkFBQUEsS0FBSyxFQUFMQSxLQUZXO0VBR1hLLGdCQUFBQSxJQUFJLEVBQUpBLElBSFc7RUFJWEUsZ0JBQUFBLElBQUksRUFBSkE7RUFKVyxlQWpCTTtFQXdCbkJuRixjQUFBQSxJQUFJLENBQUN3RyxLQUFMLENBQVd3RixJQUFYLENBQWdCSSxJQUFoQjtFQXhCbUI7RUFBQSxxQkF5QmJwTSxJQUFJLENBQUM2SixJQUFMLEVBekJhOztFQUFBO0VBQUEsZ0RBMkJaNUksR0FBRyxDQUFDNEIsSUFBSixDQUFTLENBQUM7RUFBRW9KLGdCQUFBQSxJQUFJLEVBQUUsSUFBUjtFQUFjakQsZ0JBQUFBLE9BQU8sRUFBRTtFQUF2QixlQUFELENBQVQsQ0EzQlk7O0VBQUE7RUFBQTtFQUFBO0VBQUE7RUFBQTtFQUFBO0VBQUEsS0FBckI7O0VBQUE7RUFBQTtFQUFBO0VBQUE7O0VBK0JBLFNBQU9ILFVBQVA7RUFDRCxDQXpGRDs7RUNDZSw0QkFBWTtFQUN6QixTQUFPO0VBQ0x3RCxJQUFBQSxJQUFJLEVBQUVBLElBQUksTUFBSixTQUFRckksU0FBUixDQUREO0VBRUx3RSxJQUFBQSxJQUFJLEVBQUVBLE1BQUksTUFBSixTQUFReEUsU0FBUjtFQUZELEdBQVA7RUFJRDs7QUNMRCxxQkFBZSxVQUFDckIsR0FBRCxFQUFTO0VBQ3RCLE1BQUksQ0FBQ0EsR0FBRyxDQUFDeEIsR0FBVCxFQUFjLE1BQU0sTUFBTjtFQUVkLE1BQU11SCxXQUFXLEdBQUc5SSxVQUFVLENBQUMwTSxlQUFYLENBQTJCQyxhQUFhLENBQUM1SixHQUFHLENBQUNxRixNQUFKLENBQVdwSSxVQUFaLENBQXhDLENBQXBCO0VBRUEsU0FBUThJLFdBQVI7RUFDRCxDQU5EOztFQ0RlLHNCQUFZO0VBQ3pCLFNBQU87RUFDTEUsSUFBQUEsV0FBVyxFQUFFQSxXQUFXLE1BQVgsU0FBZTVFLFNBQWY7RUFEUixHQUFQO0VBR0Q7O0FDSEQsaUJBQWUsVUFBQ3JCLEdBQUQsRUFBUztFQUN0QixNQUFJLENBQUNjLENBQUMsQ0FBQytJLEdBQUYsQ0FBTTdKLEdBQU4sRUFBVyx5QkFBWCxDQUFMLEVBQTRDLE1BQU0sMEJBQU47RUFDNUMsTUFBSSxDQUFDYyxDQUFDLENBQUMrSSxHQUFGLENBQU03SixHQUFOLEVBQVcseUJBQVgsQ0FBTCxFQUE0QyxNQUFNLDBCQUFOO0VBQzVDLE1BQUksQ0FBQ2MsQ0FBQyxDQUFDK0ksR0FBRixDQUFNN0osR0FBTixFQUFXLDJCQUFYLENBQUwsRUFBOEMsTUFBTSw0QkFBTjtFQUM5QyxNQUFJLENBQUNjLENBQUMsQ0FBQytJLEdBQUYsQ0FBTTdKLEdBQU4sRUFBVyx5QkFBWCxDQUFMLEVBQTRDLE1BQU0sMEJBQU47RUFDNUMsTUFBSSxDQUFDYyxDQUFDLENBQUMrSSxHQUFGLENBQU03SixHQUFOLEVBQVcsbUNBQVgsQ0FBTCxFQUFzRCxNQUFNLG9DQUFOO0VBQ3RELE1BQUksQ0FBQ2MsQ0FBQyxDQUFDK0ksR0FBRixDQUFNN0osR0FBTixFQUFXLHdCQUFYLENBQUwsRUFBMkMsTUFBTSx5QkFBTjtFQUU1QyxNQUFNOEosR0FBRyxHQUFHQyw4QkFBVyxFQUF2QjtFQUVDRCxFQUFBQSxHQUFHLENBQUNFLEdBQUosQ0FBUSxXQUFSLEVBQXFCaEssR0FBRyxDQUFDaUssV0FBSixDQUFnQlAsSUFBaEIsQ0FBcUJ2RCxRQUExQztFQUNBMkQsRUFBQUEsR0FBRyxDQUFDTCxJQUFKLENBQVMsU0FBVCxFQUFvQnpKLEdBQUcsQ0FBQ2lLLFdBQUosQ0FBZ0JQLElBQWhCLENBQXFCN0MsTUFBekM7RUFDQWlELEVBQUFBLEdBQUcsQ0FBQ0wsSUFBSixDQUFTLFNBQVQsRUFBb0J6SixHQUFHLENBQUNpSyxXQUFKLENBQWdCUCxJQUFoQixDQUFxQnJDLE1BQXpDO0VBQ0F5QyxFQUFBQSxHQUFHLENBQUNMLElBQUosQ0FBUyxTQUFULEVBQW9CekosR0FBRyxDQUFDaUssV0FBSixDQUFnQlAsSUFBaEIsQ0FBcUJuQyxNQUF6QztFQUNBdUMsRUFBQUEsR0FBRyxDQUFDZCxHQUFKLENBQVEsMkJBQVIsRUFBcUNoSixHQUFHLENBQUNpSyxXQUFKLENBQWdCUCxJQUFoQixDQUFxQnpCLGdCQUExRDtFQUNBNkIsRUFBQUEsR0FBRyxDQUFDTCxJQUFKLENBQVMsUUFBVCxFQUFtQnpKLEdBQUcsQ0FBQ2lLLFdBQUosQ0FBZ0JQLElBQWhCLENBQXFCeEIsS0FBeEM7RUFFRCxTQUFPNEIsR0FBUDtFQUNBLENBbEJEOztBQ0NBLGlCQUFlLFVBQUM5SixHQUFELEVBQVM7RUFDdEIsTUFBSSxDQUFDYyxDQUFDLENBQUMrSSxHQUFGLENBQU03SixHQUFOLEVBQVcsc0JBQVgsQ0FBTCxFQUF5QyxNQUFNLHVCQUFOO0VBQ3pDLE1BQUksQ0FBQ2MsQ0FBQyxDQUFDK0ksR0FBRixDQUFNN0osR0FBTixFQUFXLDJCQUFYLENBQUwsRUFBOEMsTUFBTSw0QkFBTjtFQUM5QyxNQUFJLENBQUNjLENBQUMsQ0FBQytJLEdBQUYsQ0FBTTdKLEdBQU4sRUFBVywwQkFBWCxDQUFMLEVBQTZDLE1BQU0sMkJBQU47RUFDN0MsTUFBSSxDQUFDYyxDQUFDLENBQUMrSSxHQUFGLENBQU03SixHQUFOLEVBQVcsMkJBQVgsQ0FBTCxFQUE4QyxNQUFNLDRCQUFOO0VBQzlDLE1BQUksQ0FBQ2MsQ0FBQyxDQUFDK0ksR0FBRixDQUFNN0osR0FBTixFQUFXLDBCQUFYLENBQUwsRUFBNkMsTUFBTSwyQkFBTjtFQUU5QyxNQUFNOEosR0FBRyxHQUFHQyw4QkFBVyxFQUF2QjtFQUVDRCxFQUFBQSxHQUFHLENBQUNkLEdBQUosQ0FBUSxHQUFSLEVBQWFoSixHQUFHLENBQUNpSyxXQUFKLENBQWdCcEUsSUFBaEIsQ0FBcUJtRCxHQUFsQztFQUNBYyxFQUFBQSxHQUFHLENBQUNkLEdBQUosQ0FBUSxZQUFSLEVBQXNCaEosR0FBRyxDQUFDaUssV0FBSixDQUFnQnBFLElBQWhCLENBQXFCcUQsUUFBM0M7RUFDQVksRUFBQUEsR0FBRyxDQUFDTCxJQUFKLENBQVMsWUFBVCxFQUF1QnpKLEdBQUcsQ0FBQ2lLLFdBQUosQ0FBZ0JwRSxJQUFoQixDQUFxQnNELE9BQTVDO0VBQ0FXLEVBQUFBLEdBQUcsQ0FBQ2QsR0FBSixDQUFRLFlBQVIsRUFBc0JoSixHQUFHLENBQUNpSyxXQUFKLENBQWdCcEUsSUFBaEIsQ0FBcUIwRCxRQUEzQztFQUNBTyxFQUFBQSxHQUFHLENBQUNMLElBQUosQ0FBUyxZQUFULEVBQXVCekosR0FBRyxDQUFDaUssV0FBSixDQUFnQnBFLElBQWhCLENBQXFCMkQsT0FBNUM7RUFFRCxTQUFPTSxHQUFQO0VBQ0EsQ0FoQkQ7O0FDRUEsZ0JBQWUsVUFBQzlKLEdBQUQsRUFBUztFQUN2QixNQUFNOEosR0FBRyxHQUFHQyw4QkFBVyxFQUF2QjtFQUVDRCxFQUFBQSxHQUFHLENBQUNFLEdBQUosQ0FBUSxHQUFSLEVBQWE7RUFBQSxXQUFPO0VBQUNFLE1BQUFBLEVBQUUsRUFBRSxJQUFMO0VBQVdDLE1BQUFBLE9BQU8sRUFBRTtFQUFwQixLQUFQO0VBQUEsR0FBYjtFQUVBTCxFQUFBQSxHQUFHLENBQUNNLEdBQUosQ0FBUSxPQUFSLEVBQWlCQyxPQUFPLENBQUNySyxHQUFELENBQXhCO0VBQ0Q4SixFQUFBQSxHQUFHLENBQUNNLEdBQUosQ0FBUSxRQUFSLEVBQWtCRSxLQUFVLENBQUM7RUFBQ3ROLElBQUFBLE1BQU0sRUFBRWdELEdBQUcsQ0FBQ3FGLE1BQUosQ0FBV3RJLEdBQVgsQ0FBZUM7RUFBeEIsR0FBRCxDQUE1QixFQUErRHVOLE9BQU8sQ0FBQ3ZLLEdBQUQsQ0FBdEUsRUFOdUI7RUFTdEI7RUFDRDtFQUNBOztFQUVBLFNBQU84SixHQUFQO0VBQ0EsQ0FkRDs7TUNJcUJVOzs7RUFDbkIsaUJBQXlCO0VBQUEsUUFBYnBNLE1BQWEsdUVBQUosRUFBSTs7RUFBQTs7RUFDdkI2RyxJQUFBQSxNQUFNLENBQUNDLE1BQVAsQ0FBYyxJQUFkLEVBQW9COUcsTUFBcEI7RUFDQSxRQUFJLENBQUMsS0FBS0ksR0FBVixFQUFlLEtBQUtBLEdBQUwsR0FBVyxLQUFLaU0sU0FBTCxFQUFYO0VBQ2YsU0FBS0MsSUFBTDtFQUNEOzs7O2dDQUVTdE0sUUFBUTtFQUNoQixhQUFPdU0sTUFBTSxDQUFDQyxZQUFQLENBQW9CM0YsTUFBTSxDQUFDQyxNQUFQLENBQWM7RUFDdkN2SSxRQUFBQSxJQUFJLEVBQUUsS0FEaUM7RUFFdkNrTyxRQUFBQSxHQUFHLEVBQUVwTyxPQUZrQztFQUd2Q3FPLFFBQUFBLEtBQUssRUFBRTtFQUhnQyxPQUFkLEVBSXhCMU0sTUFKd0IsQ0FBcEIsQ0FBUDtFQUtEOzs7dUNBRWdCO0VBQ2YsYUFBTzJNLGVBQWMsQ0FBQyxJQUFELENBQXJCO0VBQ0Q7OztrQ0FFVztFQUNWLGFBQU9DLFVBQVMsQ0FBQyxJQUFELENBQWhCO0VBQ0Q7OztvQ0FFYTtFQUFBOztFQUNaLGFBQU87RUFDTEMsUUFBQUEsR0FBRyxFQUFFLGVBQU07RUFDVCxjQUFJbEksT0FBSixDQUFZLFVBQUNtSSxPQUFELEVBQWE7RUFDdkJ2SixZQUFBQSxRQUFRLENBQUN3SixPQUFULENBQWlCLEtBQUksQ0FBQzlGLE1BQUwsQ0FBWXhJLEVBQVosQ0FBZUMsR0FBaEMsRUFBcUM7RUFBQ3NPLGNBQUFBLGVBQWUsRUFBRTtFQUFsQixhQUFyQztFQUNBRixZQUFBQSxPQUFPO0VBQ1IsV0FIRDtFQUlEO0VBTkksT0FBUDtFQVFEOzs7dUNBRWdCO0VBQ2YsYUFBT0csZUFBYyxDQUFDLElBQUQsQ0FBckI7RUFDRDs7O2lDQUVVO0VBQ1QsYUFBT0MsU0FBUSxDQUFDLElBQUQsQ0FBZjtFQUNEOzs7NkJBRU07RUFDTCxXQUFLOU0sR0FBTCxDQUFTYyxLQUFULENBQWUsVUFBZjtFQUNBLFdBQUtpTSxHQUFMLEdBQVdDLE9BQU8sRUFBbEI7RUFDQSxXQUFLM08sRUFBTCxHQUFVLEtBQUs0TyxXQUFMLEVBQVY7RUFFQSxXQUFLekYsS0FBTCxHQUFhLEtBQUtzRixRQUFMLEVBQWI7RUFDQSxXQUFLOU0sR0FBTCxDQUFTYyxLQUFULENBQWUsT0FBZixFQUF3QjJGLE1BQU0sQ0FBQ3lHLElBQVAsQ0FBWSxLQUFLMUYsS0FBakIsQ0FBeEI7RUFFQSxXQUFLMkYsV0FBTCxHQUFtQixLQUFLWixjQUFMLEVBQW5CO0VBQ0EsV0FBS3ZNLEdBQUwsQ0FBU2MsS0FBVCxDQUFlLGFBQWYsRUFBOEIyRixNQUFNLENBQUN5RyxJQUFQLENBQVksS0FBS0MsV0FBakIsQ0FBOUI7RUFFQSxXQUFLN0YsTUFBTCxHQUFjLEtBQUtrRixTQUFMLEVBQWQ7RUFDQSxXQUFLeE0sR0FBTCxDQUFTYyxLQUFULENBQWUsUUFBZixFQUF5QjJGLE1BQU0sQ0FBQ3lHLElBQVAsQ0FBWSxLQUFLNUYsTUFBakIsQ0FBekI7RUFFQSxXQUFLbUUsV0FBTCxHQUFtQixLQUFLb0IsY0FBTCxFQUFuQjtFQUNBLFdBQUs3TSxHQUFMLENBQVNjLEtBQVQsQ0FBZSxhQUFmLEVBQThCMkYsTUFBTSxDQUFDeUcsSUFBUCxDQUFZLEtBQUt6QixXQUFqQixDQUE5QjtFQUVBLFdBQUsyQixjQUFMO0VBQ0EsV0FBS0MsU0FBTDtFQUNBLFdBQUtDLGVBQUw7RUFDRDs7O3VDQUVnQjtFQUNmLFdBQUtQLEdBQUwsQ0FBU25CLEdBQVQsQ0FBYSxLQUFLdUIsV0FBTCxDQUFpQnBLLFVBQTlCO0VBQ0EsV0FBS2dLLEdBQUwsQ0FBU25CLEdBQVQsQ0FBYSxLQUFLdUIsV0FBTCxDQUFpQm5LLE1BQTlCO0VBQ0EsV0FBSytKLEdBQUwsQ0FBU25CLEdBQVQsQ0FBYSxLQUFLdUIsV0FBTCxDQUFpQnZLLFlBQTlCO0VBQ0EsV0FBS21LLEdBQUwsQ0FBU25CLEdBQVQsQ0FBYSxLQUFLdUIsV0FBTCxDQUFpQnJLLFNBQTlCO0VBRUEsV0FBS2lLLEdBQUwsQ0FBU25CLEdBQVQsQ0FBYSxLQUFLSCxXQUFMLENBQWlCUCxJQUFqQixDQUFzQmpCLFVBQW5DO0VBQ0EsV0FBSzhDLEdBQUwsQ0FBU25CLEdBQVQsQ0FBYSxLQUFLSCxXQUFMLENBQWlCUCxJQUFqQixDQUFzQmhCLFNBQW5DO0VBQ0Q7OztrQ0FFVztFQUNWLFVBQU1vQixHQUFHLEdBQUdpQyxNQUFNLENBQUMsSUFBRCxDQUFsQjtFQUNBLFdBQUtSLEdBQUwsQ0FBU25CLEdBQVQsQ0FBYSxTQUFiLEVBQXdCTixHQUF4QjtFQUNEOzs7d0NBRWlCO0VBQ2hCLFdBQUt5QixHQUFMLENBQVNuQixHQUFULENBQWEsVUFBQy9MLEdBQUQsRUFBTUMsR0FBTixFQUFXQyxJQUFYLEVBQW9CO0VBQy9CLFlBQU1kLEdBQUcsR0FBSSxpQkFBYjtFQUNBYyxRQUFBQSxJQUFJLENBQUNkLEdBQUQsQ0FBSjtFQUNELE9BSEQ7RUFJRDs7Ozs7Ozs7Ozs7OztFQUdDLHFCQUFLZSxHQUFMLENBQVNjLEtBQVQsQ0FBZSxTQUFmOzs7eUJBRVEsS0FBS3pDLEVBQUwsQ0FBUW9PLEdBQVI7Ozs7Ozs7OztFQUVOLHFCQUFLek0sR0FBTCxDQUFTd04sS0FBVDs7O21EQUVLLElBQUlqSixPQUFKLENBQVksVUFBQ21JLE9BQUQsRUFBYTtFQUM5QixrQkFBQSxNQUFJLENBQUNLLEdBQUwsQ0FBU1UsTUFBVCxDQUFnQixNQUFJLENBQUM1RyxNQUFMLENBQVl6SSxJQUE1QixFQUFrQyxZQUFNO0VBQ3RDLG9CQUFBLE1BQUksQ0FBQzRCLEdBQUwsQ0FBUzBOLElBQVQsaUJBQXNCLE1BQUksQ0FBQzdHLE1BQUwsQ0FBWTFJLElBQWxDLGdDQUEyRCxNQUFJLENBQUMwSSxNQUFMLENBQVl6SSxJQUF2RTs7RUFDQXNPLG9CQUFBQSxPQUFPLENBQUMsTUFBRCxDQUFQO0VBQ0QsbUJBSEQ7RUFJRCxpQkFMTTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0VDcEdYLElBQU1LLEdBQUcsR0FBRyxJQUFJZixHQUFKLENBQVE7RUFBRW5GLEVBQUFBLE1BQU0sRUFBTkE7RUFBRixDQUFSLENBQVo7RUFDQWtHLEdBQUcsQ0FBQ04sR0FBSjs7OzsifQ==
