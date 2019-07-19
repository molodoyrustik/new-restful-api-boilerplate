import _regeneratorRuntime from '@babel/runtime/regenerator';
import _asyncToGenerator from '@babel/runtime/helpers/asyncToGenerator';
import _classCallCheck from '@babel/runtime/helpers/classCallCheck';
import _createClass from '@babel/runtime/helpers/createClass';
import bunyan from 'bunyan';
import express from 'express';
import mongoose from 'mongoose';
import leftPad from 'left-pad';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import cors from 'cors';
import uuid from 'uuid';
import _ from 'lodash';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Promise$1 from 'bluebird';
import _defineProperty from '@babel/runtime/helpers/defineProperty';
import jwt$1 from 'express-jwt';
import uniqid from 'uniqid';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import smtpTransport from 'nodemailer-smtp-transport';
import { AsyncRouter } from 'express-async-router';

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
  var api = AsyncRouter();
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
  var api = AsyncRouter();
  api.get('/', ctx.controllers.User.get);
  api.get('/:id/works', ctx.controllers.User.getWorks);
  api.post('/:id/works', ctx.controllers.User.addWork);
  api.get('/:id/posts', ctx.controllers.User.getPosts);
  api.post('/:id/posts', ctx.controllers.User.addPost);
  return api;
});

var getApi = (function (ctx) {
  var api = AsyncRouter();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguZXNtLmpzIiwic291cmNlcyI6WyIuLi9zcmMvY29uZmlnL2luZGV4LmpzIiwiLi4vc3JjL21pZGRsZXdhcmVzL2FjY2Vzc0xvZ2dlci5qcyIsIi4uL3NyYy9taWRkbGV3YXJlcy9yZXFQYXJzZXIuanMiLCIuLi9zcmMvbWlkZGxld2FyZXMvY2F0Y2hFcnJvci5qcyIsIi4uL3NyYy9taWRkbGV3YXJlcy9yZXFMb2cuanMiLCIuLi9zcmMvbWlkZGxld2FyZXMvZXh0ZW5kUmVxUmVzLmpzIiwiLi4vc3JjL21pZGRsZXdhcmVzL2luZGV4LmpzIiwiLi4vc3JjL21vZGVscy9Vc2VyL1dvcmtTY2hlbWEuanMiLCIuLi9zcmMvbW9kZWxzL1VzZXIvUG9zdFNjaGVtYS5qcyIsIi4uL3NyYy9tb2RlbHMvVXNlci9Ta2lsbFNjaGVtYS5qcyIsIi4uL3NyYy9tb2RlbHMvVXNlci9Hcm91cHNTa2lsbHMuanMiLCIuLi9zcmMvbW9kZWxzL1VzZXIvVXNlci5qcyIsIi4uL3NyYy9tb2RlbHMvaW5kZXguanMiLCIuLi9zcmMvY29udHJvbGxlcnMvQXV0aC9pbmRleC5qcyIsIi4uL3NyYy9jb250cm9sbGVycy9Vc2VyL2luZGV4LmpzIiwiLi4vc3JjL2NvbnRyb2xsZXJzL2luZGV4LmpzIiwiLi4vc3JjL3V0aWxzL05vZGVtYWlsZXIvaW5kZXguanMiLCIuLi9zcmMvdXRpbHMvaW5kZXguanMiLCIuLi9zcmMvYXBpL2F1dGgvaW5kZXguanMiLCIuLi9zcmMvYXBpL3VzZXIvaW5kZXguanMiLCIuLi9zcmMvYXBpL2FwaS5qcyIsIi4uL3NyYy9BcHAuanMiLCIuLi9zcmMvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiZ2xvYmFsLl9fREVWX18gPSBmYWxzZTtcbi8vIF9fU1RBR0VfX1xuZ2xvYmFsLl9fUFJPRF9fID0gdHJ1ZTtcblxuZXhwb3J0IGRlZmF1bHQge1xuICBuYW1lOiAnWW91ciBzdXBlciBhcHAnLFxuICBwb3J0OiAzMDAxLFxuICBkYjoge1xuICAgIHVybDogJ21vbmdvZGI6Ly9sb2NhbGhvc3QvdGVzdCcsXG4gIH0sXG4gIGp3dDoge1xuICAgIHNlY3JldDogJ1lPVVJfU0VDUkVUJyxcbiAgfSxcbiAgbm9kZW1haWxlcjoge1xuICAgIHNlcnZpY2U6ICdtYWlsJyxcbiAgICBob3N0OiAnc210cC5tYWlsLnJ1JyxcbiAgICBhdXRoOiB7XG4gICAgICB1c2VyOiAnbW9sb2RveXJ1c3Rpa0BtYWlsLnJ1JyxcbiAgICAgIHBhc3M6ICdtb2xvZG95J1xuICAgIH1cbiAgfSxcbn07XG4iLCJpbXBvcnQgbGVmdFBhZCBmcm9tICdsZWZ0LXBhZCc7XG5cbmZ1bmN0aW9uIGxldmVsRm4oZGF0YSkge1xuICBpZiAoZGF0YS5lcnIgfHwgZGF0YS5zdGF0dXMgPj0gNTAwIHx8IGRhdGEuZHVyYXRpb24gPiAxMDAwMCkgeyAvLyBzZXJ2ZXIgaW50ZXJuYWwgZXJyb3Igb3IgZXJyb3JcbiAgICByZXR1cm4gJ2Vycm9yJztcbiAgfSBlbHNlIGlmIChkYXRhLnN0YXR1cyA+PSA0MDAgfHwgZGF0YS5kdXJhdGlvbiA+IDMwMDApIHsgLy8gY2xpZW50IGVycm9yXG4gICAgcmV0dXJuICd3YXJuJztcbiAgfVxuICByZXR1cm4gJ2luZm8nO1xufVxuXG5mdW5jdGlvbiBsb2dTdGFydChkYXRhKSB7XG4gIHJldHVybiBgJHtsZWZ0UGFkKGRhdGEubWV0aG9kLCA0KX0gJHtkYXRhLnVybH0gc3RhcnRlZCByZXFJZD0ke2RhdGEucmVxSWR9YDtcbn1cblxuZnVuY3Rpb24gbG9nRmluaXNoKGRhdGEpIHtcbiAgY29uc3QgdGltZSA9IChkYXRhLmR1cmF0aW9uIHx8IDApLnRvRml4ZWQoMyk7XG4gIGNvbnN0IGxlbmd0aCA9IGRhdGEubGVuZ3RoIHx8IDA7XG4gIHJldHVybiBgJHtsZWZ0UGFkKGRhdGEubWV0aG9kLCA0KX0gJHtkYXRhLnVybH0gJHtsZWZ0UGFkKGRhdGEuc3RhdHVzLCAzKX0gJHtsZWZ0UGFkKHRpbWUsIDcpfW1zICR7bGVmdFBhZChsZW5ndGgsIDUpfWIgcmVxSWQ9JHtkYXRhLnJlcUlkfWA7XG59XG5cbmV4cG9ydCBkZWZhdWx0IChwYXJhbXMpID0+IChbXG4gIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIGNvbnN0IGRhdGEgPSB7fVxuICAgIGlmICghcmVxLmxvZykgdGhyb3cgJ2hhcyBubyByZXEubG9nISdcbiAgICBjb25zdCBsb2cgPSByZXEubG9nLmNoaWxkKHtcbiAgICAgIGNvbXBvbmVudDogJ3JlcScsXG4gICAgfSk7XG5cbiAgICBkYXRhLnJlcUlkID0gcmVxLnJlcUlkXG4gICAgZGF0YS5tZXRob2QgPSByZXEubWV0aG9kXG4gICAgaWYgKHJlcS53cykgZGF0YS5tZXRob2QgPSAnV1MnXG4gICAgZGF0YS5ob3N0ID0gcmVxLmhlYWRlcnMuaG9zdFxuICAgIGRhdGEudXJsID0gKHJlcS5iYXNlVXJsIHx8ICcnKSArIChyZXEudXJsIHx8ICctJylcbiAgICBkYXRhLnJlZmVyZXIgPSByZXEuaGVhZGVyKCdyZWZlcmVyJykgfHwgcmVxLmhlYWRlcigncmVmZXJyZXInKVxuICAgIGRhdGEuaXAgPSByZXEuaXAgfHwgcmVxLmNvbm5lY3Rpb24ucmVtb3RlQWRkcmVzcyB8fFxuICAgICAgICAocmVxLnNvY2tldCAmJiByZXEuc29ja2V0LnJlbW90ZUFkZHJlc3MpIHx8XG4gICAgICAgIChyZXEuc29ja2V0LnNvY2tldCAmJiByZXEuc29ja2V0LnNvY2tldC5yZW1vdGVBZGRyZXNzKSB8fFxuICAgICAgICAnMTI3LjAuMC4xJ1xuXG5cbiAgICBpZiAoX19ERVZfXykge1xuICAgICAgbG9nLmRlYnVnKGRhdGEsIGxvZ1N0YXJ0KGRhdGEpKTtcbiAgICAgIGlmIChyZXEuYm9keSkge1xuICAgICAgICBsb2cudHJhY2UoSlNPTi5zdHJpbmdpZnkocmVxLmJvZHkpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBocnRpbWUgPSBwcm9jZXNzLmhydGltZSgpO1xuICAgIGZ1bmN0aW9uIGxvZ2dpbmcoKSB7XG4gICAgICBkYXRhLnN0YXR1cyA9IHJlcy5zdGF0dXNDb2RlXG4gICAgICBkYXRhLmxlbmd0aCA9IHJlcy5nZXRIZWFkZXIoJ0NvbnRlbnQtTGVuZ3RoJylcblxuICAgICAgY29uc3QgZGlmZiA9IHByb2Nlc3MuaHJ0aW1lKGhydGltZSk7XG4gICAgICBkYXRhLmR1cmF0aW9uID0gZGlmZlswXSAqIDFlMyArIGRpZmZbMV0gKiAxZS02XG5cbiAgICAgIGxvZ1tsZXZlbEZuKGRhdGEpXShkYXRhLCBsb2dGaW5pc2goZGF0YSkpO1xuICAgIH1cbiAgICByZXMub24oJ2ZpbmlzaCcsIGxvZ2dpbmcpO1xuICAgIHJlcy5vbignY2xvc2UnLCBsb2dnaW5nKTtcbiAgICBuZXh0KCk7XG4gIH1cbl0pXG4iLCJpbXBvcnQgY29va2llUGFyc2VyIGZyb20gJ2Nvb2tpZS1wYXJzZXInXG5pbXBvcnQgYm9keVBhcnNlciBmcm9tICdib2R5LXBhcnNlcidcbmltcG9ydCBjb3JzIGZyb20gJ2NvcnMnXG5cbmV4cG9ydCBkZWZhdWx0IChjdHgpID0+IChbXG4gIGJvZHlQYXJzZXIuanNvbigpLFxuICBib2R5UGFyc2VyLnVybGVuY29kZWQoeyBleHRlbmRlZDogdHJ1ZSB9KSxcbiAgY29va2llUGFyc2VyKCksXG4gIGNvcnMoKSxcbl0pXG4iLCJleHBvcnQgZGVmYXVsdCAoY3R4KSA9PiAoXG4gIChlcnIsIHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgaWYocmVxICYmIHJlcS5sb2cgJiYgcmVxLmxvZy5lcnJvcil7XG4gICAgICByZXEubG9nLmVycm9yKHtcbiAgICAgICAgZXJyLFxuICAgICAgICBxdWVyeTogcmVxLnF1ZXJ5LFxuICAgICAgICBib2R5OiByZXEuYm9keSxcbiAgICAgICAgaGVhZGVyczogcmVxLmhlYWRlcnNcbiAgICAgIH0sIChlcnIgfHwge30pLnN0YWNrKVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgfVxuICAgIHJlcy5zdGF0dXMoZXJyLnN0YXR1cyB8fCA1MDApXG4gICAgcmV0dXJuIHJlcy5qc29uKFtdKTtcbiAgICBpZiAocmVzLmVycikgcmV0dXJuIHJlcy5lcnIoZXJyKVxuICAgIHJldHVybiByZXMuanNvbihlcnIpXG4gIH1cbilcbiIsImltcG9ydCB1dWlkIGZyb20gJ3V1aWQnXG5cbmV4cG9ydCBkZWZhdWx0IChwYXJhbXMpID0+IChbXG4gIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIGlmIChfX1BST0RfXykge1xuICAgICAgcmVxLnJlcUlkID0gdXVpZC52NCgpXG4gICAgfSBlbHNlIHtcbiAgICAgIGdsb2JhbC5yZXFJZCA9IDEgKyAoZ2xvYmFsLnJlcUlkIHx8IDApXG4gICAgICByZXEucmVxSWQgPSBnbG9iYWwucmVxSWRcbiAgICB9XG4gICAgaWYgKHBhcmFtcy5sb2cpIHtcbiAgICAgIHJlcS5sb2cgPSBwYXJhbXMubG9nLmNoaWxkKHtcbiAgICAgICAgcmVxSWQ6IHJlcS5yZXFJZCxcbiAgICAgIH0pO1xuICAgIH1cbiAgICBuZXh0KClcbiAgfSxcbl0pXG4iLCJpbXBvcnQgXyBmcm9tICdsb2Rhc2gnXG5leHBvcnQgZGVmYXVsdCAoY3R4KSA9PiAoW1xuICAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICBpZiAoY3R4LnJlcXVlc3RzKSB7XG4gICAgICBfLmZvckVhY2goY3R4LnJlcXVlc3RzLCAodmFsLCBrZXkpID0+IHtcbiAgICAgICAgcmVxW2tleV0gPSB2YWwuYmluZChyZXEpXG4gICAgICB9KVxuICAgICAgLy8gaWYgKHJlcS5hbGxQYXJhbXMpIHtcbiAgICAgIC8vICAgcmVxLnBhcmFtcyA9IHJlcS5hbGxQYXJhbXMuYmluZChyZXEpKClcbiAgICAgIC8vIH1cbiAgICB9XG4gICAgaWYgKGN0eC5yZXNwb25zZXMpIHtcbiAgICAgIF8uZm9yRWFjaChjdHgucmVzcG9uc2VzLCAodmFsLCBrZXkpID0+IHtcbiAgICAgICAgcmVzW2tleV0gPSB2YWwuYmluZChyZXMpXG4gICAgICB9KVxuICAgIH1cbiAgICBuZXh0KClcbiAgfVxuXSlcbiIsIi8vIGZzXG5pbXBvcnQgYWNjZXNzTG9nZ2VyIGZyb20gJy4vYWNjZXNzTG9nZ2VyJ1xuaW1wb3J0IHJlcVBhcnNlciBmcm9tICcuL3JlcVBhcnNlcidcbmltcG9ydCBjYXRjaEVycm9yIGZyb20gJy4vY2F0Y2hFcnJvcidcbmltcG9ydCByZXFMb2cgZnJvbSAnLi9yZXFMb2cnXG5pbXBvcnQgZXh0ZW5kUmVxUmVzIGZyb20gJy4vZXh0ZW5kUmVxUmVzJ1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoY3R4KSB7XG4gIHJldHVybiB7XG4gICAgYWNjZXNzTG9nZ2VyOiBhY2Nlc3NMb2dnZXIoLi4uYXJndW1lbnRzKSxcbiAgICByZXFQYXJzZXI6IHJlcVBhcnNlciguLi5hcmd1bWVudHMpLFxuICAgIGNhdGNoRXJyb3I6IGNhdGNoRXJyb3IoLi4uYXJndW1lbnRzKSxcbiAgICByZXFMb2c6IHJlcUxvZyguLi5hcmd1bWVudHMpLFxuICAgIGV4dGVuZFJlcVJlczogZXh0ZW5kUmVxUmVzKC4uLmFyZ3VtZW50cyksXG4gIH1cbn1cbiIsImltcG9ydCBtb25nb29zZSBmcm9tICdtb25nb29zZSdcblxuY29uc3QgV29ya3NTY2hlbWEgPSBuZXcgbW9uZ29vc2UuU2NoZW1hKHtcbiAgaWQ6IHtcbiAgICB0eXBlOiBTdHJpbmcsXG4gICAgdHJpbTogdHJ1ZSxcbiAgfSxcbiAgdGl0bGU6IHtcbiAgICB0eXBlOiBTdHJpbmcsXG4gICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgdHJpbTogdHJ1ZSxcbiAgfSxcbiAgdGVjaG5vbG9naWVzOiB7XG4gICAgdHlwZTogU3RyaW5nLFxuICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgIHRyaW06IHRydWUsXG4gIH0sXG4gIGltZ1VybDoge1xuICAgIHR5cGU6IFN0cmluZyxcbiAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICB0cmltOiB0cnVlLFxuICB9LFxufSlcblxuXG5leHBvcnQgZGVmYXVsdCBXb3Jrc1NjaGVtYVxuIiwiaW1wb3J0IG1vbmdvb3NlIGZyb20gJ21vbmdvb3NlJ1xuXG5jb25zdCBQb3N0U2NoZW1hID0gbmV3IG1vbmdvb3NlLlNjaGVtYSh7XG4gIGlkOiB7XG4gICAgdHlwZTogU3RyaW5nLFxuICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgIHRyaW06IHRydWUsXG4gIH0sXG4gIHRpdGxlOiB7XG4gICAgdHlwZTogU3RyaW5nLFxuICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgIHRyaW06IHRydWUsXG4gIH0sXG4gIGRhdGU6IHtcbiAgICB0eXBlOiBOdW1iZXIsXG4gICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgdHJpbTogdHJ1ZSxcbiAgfSxcbiAgdGV4dDoge1xuICAgIHR5cGU6IFN0cmluZyxcbiAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICB0cmltOiB0cnVlLFxuICB9LFxufSlcblxuXG5leHBvcnQgZGVmYXVsdCBQb3N0U2NoZW1hO1xuIiwiaW1wb3J0IG1vbmdvb3NlIGZyb20gJ21vbmdvb3NlJ1xuXG5jb25zdCBTa2lsbFNjaGVtYSA9IG5ldyBtb25nb29zZS5TY2hlbWEoe1xuICBpZDoge1xuICAgIHR5cGU6IFN0cmluZyxcbiAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICB0cmltOiB0cnVlLFxuICB9LFxuICBncm91cElkOiB7XG4gICAgdHlwZTogU3RyaW5nLFxuICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgIHRyaW06IHRydWUsXG4gIH0sXG4gIHRpdGxlOiB7XG4gICAgdHlwZTogU3RyaW5nLFxuICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgIHRyaW06IHRydWUsXG4gIH0sXG4gIHZhbHVlOiB7XG4gICAgdHlwZTogTnVtYmVyLFxuICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgIHRyaW06IHRydWUsXG4gIH0sXG59KVxuXG5cbmV4cG9ydCBkZWZhdWx0IFNraWxsU2NoZW1hO1xuIiwiaW1wb3J0IG1vbmdvb3NlIGZyb20gJ21vbmdvb3NlJ1xuXG5pbXBvcnQgU2tpbGxTY2hlbWEgZnJvbSAnLi9Ta2lsbFNjaGVtYSc7XG5cbmNvbnN0IEdyb3Vwc1NraWxscyA9IG5ldyBtb25nb29zZS5TY2hlbWEoe1xuICBpZDoge1xuICAgIHR5cGU6IFN0cmluZyxcbiAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICB0cmltOiB0cnVlLFxuICB9LFxuICB0aXRsZToge1xuICAgIHR5cGU6IFN0cmluZyxcbiAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICB0cmltOiB0cnVlLFxuICB9LFxuICBza2lsbHM6IFtTa2lsbFNjaGVtYV0sXG59KVxuXG5cbmV4cG9ydCBkZWZhdWx0IEdyb3Vwc1NraWxscztcbiIsImltcG9ydCBfIGZyb20gJ2xvZGFzaCdcbmltcG9ydCBqd3QgZnJvbSAnanNvbndlYnRva2VuJ1xuaW1wb3J0IGJjcnlwdCBmcm9tICdiY3J5cHRqcydcbmltcG9ydCBQcm9taXNlIGZyb20gJ2JsdWViaXJkJ1xuY29uc3QgYmNyeXB0R2VuU2FsdCA9IFByb21pc2UucHJvbWlzaWZ5KGJjcnlwdC5nZW5TYWx0KVxuY29uc3QgYmNyeXB0SGFzaCA9IFByb21pc2UucHJvbWlzaWZ5KGJjcnlwdC5oYXNoKVxuY29uc3QgYmNyeXB0Q29tcGFyZSA9IFByb21pc2UucHJvbWlzaWZ5KGJjcnlwdC5jb21wYXJlKVxuaW1wb3J0IG1vbmdvb3NlIGZyb20gJ21vbmdvb3NlJ1xuXG5pbXBvcnQgV29ya1NjaGVtYSBmcm9tICcuL1dvcmtTY2hlbWEnO1xuaW1wb3J0IFBvc3RTY2hlbWEgZnJvbSAnLi9Qb3N0U2NoZW1hJztcbmltcG9ydCBHcm91cHNTa2lsbHMgZnJvbSAnLi9Hcm91cHNTa2lsbHMnO1xuXG5leHBvcnQgZGVmYXVsdCAoY3R4KSA9PiB7XG4gIGlmICghY3R4LmxvZykgdGhyb3cgJyFsb2cnXG5cbiAgY29uc3Qgc2NoZW1hID0gbmV3IG1vbmdvb3NlLlNjaGVtYSh7XG4gICAgZW1haWw6IHtcbiAgICAgIHR5cGU6IFN0cmluZyxcbiAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgdHJpbTogdHJ1ZSxcbiAgICB9LFxuICAgIGlkOiB7XG4gICAgICB0eXBlOiBTdHJpbmcsXG4gICAgICB0cmltOiB0cnVlLFxuICAgIH0sXG4gICAgcGFzc3dvcmQ6IHtcbiAgICAgIHR5cGU6IFN0cmluZyxcbiAgICB9LFxuICAgIGZvcmdvdEVtYWlsVG9rZW46IHtcbiAgICAgIHR5cGU6IFN0cmluZyxcbiAgICAgIHRyaW06IHRydWUsXG4gICAgfSxcbiAgICB3b3JrczogW1dvcmtTY2hlbWFdLFxuICAgIHBvc3RzOiBbUG9zdFNjaGVtYV0sXG4gICAgZ3JvdXBzU2tpbGxzOiBbR3JvdXBzU2tpbGxzXVxuXG4gIH0sIHtcbiAgICBjb2xsZWN0aW9uOiAndXNlcicsXG4gICAgdGltZXN0YW1wczogdHJ1ZSxcbiAgfSlcblxuICBzY2hlbWEuc3RhdGljcy5pc1ZhbGlkRW1haWwgPSBmdW5jdGlvbiAoZW1haWwpIHtcbiAgICBjb25zdCByZSA9IC9eKChbXjw+KClcXFtcXF1cXFxcLiw7Olxcc0BcIl0rKFxcLltePD4oKVxcW1xcXVxcXFwuLDs6XFxzQFwiXSspKil8KFwiLitcIikpQCgoXFxbWzAtOV17MSwzfVxcLlswLTldezEsM31cXC5bMC05XXsxLDN9XFwuWzAtOV17MSwzfV0pfCgoW2EtekEtWlxcLTAtOV0rXFwuKStbYS16QS1aXXsyLH0pKSQvO1xuICAgIHJldHVybiByZS50ZXN0KGVtYWlsKVxuICB9XG4gIHNjaGVtYS5zdGF0aWNzLmdlbmVyYXRlUGFzc3dvcmQgPSBmdW5jdGlvbiAobGVuZ3RoID0gMTApIHtcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIGxlbmd0aClcbiAgfVxuICBzY2hlbWEubWV0aG9kcy50b0pTT04gPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIF8ub21pdCh0aGlzLnRvT2JqZWN0KCksIFsncGFzc3dvcmQnXSlcbiAgfVxuICBzY2hlbWEubWV0aG9kcy5nZXRJZGVudGl0eSA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICBjb25zdCBvYmplY3QgPSBfLnBpY2sodGhpcy50b09iamVjdCgpLCBbJ19pZCcsICdlbWFpbCcsICdpZCddKVxuICAgIGlmICghcGFyYW1zKSByZXR1cm4gb2JqZWN0XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24ob2JqZWN0LCBwYXJhbXMpXG4gIH1cbiAgc2NoZW1hLm1ldGhvZHMuZ2VuZXJhdGVBdXRoVG9rZW4gPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgcmV0dXJuIGp3dC5zaWduKHRoaXMuZ2V0SWRlbnRpdHkocGFyYW1zKSwgY3R4LmNvbmZpZy5qd3Quc2VjcmV0KVxuICB9XG4gIHNjaGVtYS5tZXRob2RzLnZlcmlmeVBhc3N3b3JkID0gYXN5bmMgZnVuY3Rpb24gKHBhc3N3b3JkKSB7XG4gICAgcmV0dXJuIGF3YWl0IGJjcnlwdENvbXBhcmUocGFzc3dvcmQsIHRoaXMucGFzc3dvcmQpXG4gIH1cblxuICBjb25zdCBTQUxUX1dPUktfRkFDVE9SID0gMTBcbiAgc2NoZW1hLnByZSgnc2F2ZScsIGZ1bmN0aW9uIChuZXh0KSB7XG4gICAgaWYgKCF0aGlzLmlzTW9kaWZpZWQoJ3Bhc3N3b3JkJykpIHJldHVybiBuZXh0KCk7XG4gICAgcmV0dXJuIGJjcnlwdEdlblNhbHQoU0FMVF9XT1JLX0ZBQ1RPUilcbiAgICAudGhlbihzYWx0ID0+IHtcbiAgICAgIGJjcnlwdEhhc2godGhpcy5wYXNzd29yZCwgc2FsdClcbiAgICAgIC50aGVuKGhhc2ggPT4ge1xuICAgICAgICB0aGlzLnBhc3N3b3JkID0gaGFzaFxuICAgICAgICBuZXh0KCk7XG4gICAgICB9KVxuICAgIH0pXG4gICAgLmNhdGNoKG5leHQpXG4gIH0pO1xuXG4gIHJldHVybiBtb25nb29zZS5tb2RlbCgnVXNlcicsIHNjaGVtYSk7XG59XG4iLCJpbXBvcnQgVXNlciBmcm9tICcuL1VzZXIvVXNlcic7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICBVc2VyOiBVc2VyKC4uLmFyZ3VtZW50cyksXG4gIH1cbn1cbiIsImltcG9ydCBqd3QgZnJvbSAnZXhwcmVzcy1qd3QnXG5pbXBvcnQgdW5pcWlkIGZyb20gJ3VuaXFpZCc7XG5pbXBvcnQgY3J5cHRvIGZyb20gJ2NyeXB0byc7XG5cbmV4cG9ydCBmdW5jdGlvbiBjYW5vbml6ZShzdHIpIHtcbiAgcmV0dXJuIHN0ci50b0xvd2VyQ2FzZSgpLnRyaW0oKVxufVxuXG5leHBvcnQgZGVmYXVsdCAoY3R4KSA9PiB7XG4gIGNvbnN0IFVzZXIgPSBjdHgubW9kZWxzLlVzZXI7XG5cbiAgY29uc3QgdHJhbnNwb3J0ZXIgPSBjdHgudXRpbHMuVHJhbnNwb3J0ZXI7XG5cbiAgY29uc3QgY29udHJvbGxlciA9IHt9XG5cbiAgY29udHJvbGxlci52YWxpZGF0ZSA9IGFzeW5jIGZ1bmN0aW9uIChyZXEsIHJlcykge1xuICAgIGlmKHJlcS51c2VyKSB7XG4gICAgICBjb25zdCB1c2VyID0gYXdhaXQgVXNlci5maW5kT25lKHtpZDogcmVxLnVzZXIuaWR9KVxuICAgICAgaWYgKCF1c2VyKSByZXR1cm4gcmVzLnN0YXR1cyg0MDQpLmpzb24oW3t2YWxpZGF0ZTogZmFsc2UsIG1lc3NhZ2U6ICfQn9C+0LvRjNC30L7QstCw0YLQtdC70Ywg0L3QtSDQvdCw0LnQtNC10L0g0LIg0LHQsNC30LUnfV0pO1xuICAgICAgcmV0dXJuIFt7XG4gICAgICAgIHZhbGlkYXRlOiB0cnVlLFxuICAgICAgICBfX3BhY2s6IDEsXG4gICAgICAgIGp3dDogcmVxLnVzZXIsXG4gICAgICAgIHVzZXI6IHVzZXIsXG4gICAgICB9XVxuICAgIH1cbiAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDQpLmpzb24oW3t2YWxpZGF0ZTogZmFsc2UsIG1lc3NhZ2U6ICfQn9C+0LvRjNC30L7QstCw0YLQtdC70Ywg0L3QtSDQvdCw0LnQtNC10L0g0LIg0LHQsNC30LUnfV0pO1xuICB9XG5cbiAgY29udHJvbGxlci5nZXRVc2VyRmllbGRzID0gZnVuY3Rpb24gKHJlcSkge1xuICAgIHJldHVybiByZXEuYm9keTtcbiAgfVxuXG4gIGNvbnRyb2xsZXIudmFsaWRhdGlvblVzZXJGaWVsZHMgPSBmdW5jdGlvbih1c2VyRmllbGRzLCByZXMpIHtcbiAgICBsZXQgdmFsaWQgPSB7XG4gICAgICBpc1ZhbGlkOiBmYWxzZSxcbiAgICAgIG1lc3NhZ2U6IFtdXG4gICAgfVxuXG4gICAgaWYoIXVzZXJGaWVsZHMuY2FwdGNoYSkge1xuICAgICAgdmFsaWQuaXNWYWxpZCA9IHRydWU7XG4gICAgICB2YWxpZC5tZXNzYWdlID0gW3tzaWdudXA6IGZhbHNlLCBtZXNzYWdlOiAn0J/QsNGA0LDQvNC10YLRgCBjYXB0Y2hhINC90LUg0L/QtdGA0LXQtNCw0L0g0LjQu9C4INCy0LLQtdC00LXQvSDQvdC10LLQtdGA0L3Qvid9XVxuICAgIH1cblxuICAgIGlmKCF1c2VyRmllbGRzLmVtYWlsIHx8ICF1c2VyRmllbGRzLnBhc3N3b3JkKSB7XG4gICAgICB2YWxpZC5pc1ZhbGlkID0gdHJ1ZTtcbiAgICAgIHZhbGlkLm1lc3NhZ2UgPSBbe3NpZ251cDogZmFsc2UsIG1lc3NhZ2U6ICfQn9Cw0YDQsNC80LXRgtGAcyBlbWFpbCDQuNC70LggcGFzc3dvcmQg0L3QtSDQv9C10YDQtdC00LDQvSd9XVxuICAgIH1cblxuICAgIHJldHVybiB2YWxpZDtcbiAgfVxuXG4gIGNvbnRyb2xsZXIuZ2V0VXNlckNyaXRlcmlhID0gZnVuY3Rpb24gKHJlcSwgcmVzKSB7XG4gICAgY29uc3QgcGFyYW1zID0gcmVxLmJvZHlcbiAgICBpZiAocGFyYW1zLmVtYWlsKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBlbWFpbDogcGFyYW1zLmVtYWlsLFxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDApLmpzb24oW3tzaWdudXA6IGZhbHNlLCBtZXNzYWdlOiAn0J/QsNGA0LDQvNC10YLRgCBlbWFpbCDQvdC1INC/0LXRgNC10LTQsNC9J31dKTtcbiAgfVxuXG4gIGNvbnRyb2xsZXIuc2lnbnVwID0gYXN5bmMgZnVuY3Rpb24gKHJlcSwgcmVzKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHVzZXJGaWVsZHMgPSBjb250cm9sbGVyLmdldFVzZXJGaWVsZHMocmVxLCByZXMpO1xuICAgICAgY29uc3QgdmFsaWQgPSBjb250cm9sbGVyLnZhbGlkYXRpb25Vc2VyRmllbGRzKHVzZXJGaWVsZHMsIHJlcyk7XG4gICAgICBpZiAodmFsaWQuaXNWYWxpZCkge1xuICAgICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDApLmpzb24odmFsaWQubWVzc2FnZSk7XG4gICAgICB9XG4gICAgICBjb25zdCBjcml0ZXJpYSA9IGNvbnRyb2xsZXIuZ2V0VXNlckNyaXRlcmlhKHJlcSwgcmVzKTtcblxuICAgICAgY29uc3QgZXhpc3RVc2VyID0gYXdhaXQgVXNlci5maW5kT25lKGNyaXRlcmlhKVxuICAgICAgaWYgKGV4aXN0VXNlcikgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKFt7c2lnbnVwOiBmYWxzZSwgbWVzc2FnZTogJ9Ci0LDQutC+0LkgZW1haWwg0LfQsNGA0LXQs9C40YHRgtGA0LjRgNC+0LLQsNC9J31dKTtcblxuICAgICAgY29uc3QgdXNlciA9IG5ldyBVc2VyKHtcbiAgICAgICAgLi4udXNlckZpZWxkcyxcbiAgICAgICAgaWQ6IHVuaXFpZCgpLFxuICAgICAgICBmb3Jnb3RFbWFpbFRva2VuOiAnJyxcbiAgICAgIH0pO1xuXG4gICAgICBhd2FpdCB1c2VyLnNhdmUoKVxuXG4gICAgICBjb25zdCByZXN1bHQgPSBbe1xuICAgICAgICBzaWdudXA6IHRydWUsXG4gICAgICAgIHVzZXIsXG4gICAgICAgIHRva2VuOiB1c2VyLmdlbmVyYXRlQXV0aFRva2VuKCksXG4gICAgICB9XVxuXG4gICAgICByZXR1cm4gcmVzLmpzb24ocmVzdWx0KVxuXG4gICAgfSBjYXRjaChlcnIpIHtcbiAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICByZXR1cm4gcmVzLnN0YXR1cyg1MDApLmpzb24oZXJyKVxuICAgIH1cbiAgfVxuXG4gIGNvbnRyb2xsZXIuc2lnbmluID0gYXN5bmMgZnVuY3Rpb24gKHJlcSwgcmVzKSB7XG4gICAgY29uc3QgcGFyYW1zID0gY29udHJvbGxlci5nZXRVc2VyRmllbGRzKHJlcSwgcmVzKTtcbiAgICBpZiAoIXBhcmFtcy5wYXNzd29yZCkgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKFt7bG9naW46IGZhbHNlLCBtZXNzYWdlOiAn0J/QsNGA0LDQvNC10YLRgCBwYXNzd29yZCDQvdC1INC/0LXRgNC10LTQsNC9J31dKTtcblxuICAgIGNvbnN0IGNyaXRlcmlhID0gY29udHJvbGxlci5nZXRVc2VyQ3JpdGVyaWEocmVxKTtcbiAgICBjb25zdCB1c2VyID0gYXdhaXQgVXNlci5maW5kT25lKGNyaXRlcmlhKTtcblxuICAgIGlmICghdXNlcikgcmV0dXJuIHJlcy5zdGF0dXMoNDA0KS5qc29uKFt7bG9naW46IGZhbHNlLCBtZXNzYWdlOiAn0KLQsNC60L7QuSDQv9C+0LvRjNC30L7QstCw0YLQtdC70Ywg0L3QtSDQvdCw0LnQtNC10L0nfV0pO1xuICAgIGF3YWl0IHVzZXIuc2F2ZSgpO1xuXG4gICAgaWYgKCFhd2FpdCB1c2VyLnZlcmlmeVBhc3N3b3JkKHBhcmFtcy5wYXNzd29yZCkpIHtcbiAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbihbe2xvZ2luOiBmYWxzZSwgbWVzc2FnZTogJ9Cf0LXRgNC10LTQsNC90L3Ri9C5INC/0LDRgNC+0LvRjCDQvdC1INC/0L7QtNGF0L7QtNC40YInfV0pO1xuICAgIH1cblxuICAgIHJldHVybiByZXMuanNvbihbe1xuICAgICAgX19wYWNrOiAxLFxuICAgICAgbG9naW46IHRydWUsXG4gICAgICB1c2VyLFxuICAgICAgdG9rZW46IHVzZXIuZ2VuZXJhdGVBdXRoVG9rZW4oKSxcbiAgICB9XSlcbiAgfVxuXG4gIGNvbnRyb2xsZXIuZm9yZ290ID0gYXN5bmMgZnVuY3Rpb24gKHJlcSwgcmVzKSB7XG4gICAgY29uc3QgcGFyYW1zID0gY29udHJvbGxlci5nZXRVc2VyRmllbGRzKHJlcSwgcmVzKTtcblxuICAgIGlmICghcGFyYW1zLmVtYWlsKSByZXR1cm4gcmVzLnN0YXR1cyg0MDApLmpzb24oW3sgZm9yZ290OiBmYWxzZSwgbWVzc2FnZTogJ9Cf0LDRgNCw0LzQtdGC0YAgZW1haWwg0L3QtSDQv9C10YDQtdC00LDQvScgfV0pO1xuXG4gICAgY29uc3QgY3JpdGVyaWEgPSBjb250cm9sbGVyLmdldFVzZXJDcml0ZXJpYShyZXEpO1xuICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBVc2VyLmZpbmRPbmUoY3JpdGVyaWEpO1xuXG4gICAgaWYgKCF1c2VyKSByZXR1cm4gcmVzLnN0YXR1cyg0MDQpLmpzb24oW3tsb2dpbjogZmFsc2UsIG1lc3NhZ2U6ICfQn9C+0LvRjNC30L7QstCw0YLQtdC70Ywg0YEg0YLQsNC60LjQvCBlbWFpbCDQvdC1INC90LDQudC00LXQvSDQsiDQsdCw0LfQtSd9XSk7XG5cbiAgICBjb25zdCB0b2tlbiA9IGF3YWl0IGNyeXB0by5yYW5kb21CeXRlcygzMik7XG5cbiAgICB1c2VyLmZvcmdvdEVtYWlsVG9rZW4gPSB0b2tlbi50b1N0cmluZygnaGV4Jyk7XG4gICAgYXdhaXQgdXNlci5zYXZlKCk7XG5cblxuICAgIGxldCBzaXRlVXJsID0gJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMC8nO1xuICAgIGlmIChfX1BST0RfXykge1xuICAgICAgc2l0ZVVybCA9ICdodHRwOi8vYXBwLmFzaGxpZS5pby8nO1xuICAgIH1cblxuICAgIGxldCBtYWlsVGV4dCA9IGDQn9C10YDQtdC50LTQuNGC0LUg0L/QviDRgdGB0YvQu9C60LUg0YfRgtC+0LHRiyDQuNC30LzQtdC90LjRgtGMINC/0LDRgNC+0LvRjCAke3NpdGVVcmx9YXV0aC9mb3Jnb3QvJHt1c2VyLmZvcmdvdEVtYWlsVG9rZW59YDtcblxuICAgIHZhciBtYWlsT3B0aW9ucyA9IHtcbiAgICAgIGZyb206ICdtb2xvZG95cnVzdGlrQG1haWwucnUnLFxuICAgICAgdG86IHVzZXIuZW1haWwsXG4gICAgICBzdWJqZWN0OiAn0JLQvtGB0YHRgtCw0L3QvtCy0LvQtdC90LjRjyDQv9Cw0YDQvtC70Y8g0YHQsNC50YLQsCBBc2hpbGUuaW8nLFxuICAgICAgdGV4dDogbWFpbFRleHRcbiAgICB9O1xuICAgIGF3YWl0IHRyYW5zcG9ydGVyLnNlbmRNYWlsKG1haWxPcHRpb25zKTtcblxuICAgIGNvbnN0IHJlc3VsdCA9IFt7XG4gICAgICBfX3BhY2s6IDEsXG4gICAgICBmb3Jnb3Q6IHRydWVcbiAgICB9XTtcbiAgICByZXR1cm4gcmVzLmpzb24ocmVzdWx0KTtcbiAgfVxuXG4gIGNvbnRyb2xsZXIuY2hlY2tGb3Jnb3RUb2tlbiA9IGFzeW5jIGZ1bmN0aW9uIChyZXEsIHJlcykge1xuICAgIGNvbnN0IHsgZm9yZ290RW1haWxUb2tlbiB9ID0gcmVxLnBhcmFtcztcblxuICAgIGlmICghZm9yZ290RW1haWxUb2tlbikge1xuICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKFt7Y2hlY2tGb3Jnb3RUb2tlbjogZmFsc2UsIG1lc3NhZ2U6ICfQotC+0LrQtdC9INC90LUg0LHRi9C7INC/0LXRgNC10LTQsNC9J31dKTtcbiAgICB9XG5cbiAgICBjb25zdCBjcml0ZXJpYSA9IHsgZm9yZ290RW1haWxUb2tlbiB9O1xuICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBVc2VyLmZpbmRPbmUoY3JpdGVyaWEpO1xuXG4gICAgaWYgKCF1c2VyKSByZXR1cm4gcmVzLnN0YXR1cyg0MDQpLmpzb24oW3tjaGVja0ZvcmdvdFRva2VuOiBmYWxzZSwgbWVzc2FnZTogJ9Cf0L7Qu9GM0LfQvtCy0LDRgtC10LvRjCDRgSDRgtCw0LrQuNC8INGC0L7QutC10L3QvtC8INC90LUg0L3QsNC50LTQtdC9J31dKTtcblxuICAgIHJldHVybiByZXMuanNvbihbe1xuICAgICAgICBfX3BhY2s6IDEsXG4gICAgICAgIGNoZWNrRm9yZ290VG9rZW46IHRydWVcbiAgICB9XSk7XG4gIH1cblxuICBjb250cm9sbGVyLnJlc2V0ID0gYXN5bmMgZnVuY3Rpb24gKHJlcSwgcmVzKSB7XG4gICAgY29uc3QgcGFyYW1zID0gY29udHJvbGxlci5nZXRVc2VyRmllbGRzKHJlcSwgcmVzKTtcbiAgICBjb25zdCB7IHBhc3N3b3JkLCBjaGVja1Bhc3N3b3JkLCBmb3Jnb3RFbWFpbFRva2VuLCB9ID0gcGFyYW1zO1xuXG4gICAgaWYgKCFwYXNzd29yZCkgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKFt7cmVzZXQ6IGZhbHNlLCBtZXNzYWdlOiAn0J/QsNGA0LDQvNC10YLRgCBwYXNzd29yZCDQvdC1INC/0LXRgNC10LTQsNC9J31dKTtcbiAgICBpZiAoIWNoZWNrUGFzc3dvcmQpIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbihbe3Jlc2V0OiBmYWxzZSwgbWVzc2FnZTogJ9Cf0LDRgNCw0LzQtdGC0YAgY2hlY2tQYXNzd29yZCDQvdC1INC/0LXRgNC10LTQsNC9J31dKTtcbiAgICBpZiAocGFzc3dvcmQgIT09IGNoZWNrUGFzc3dvcmQpIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbihbe3Jlc2V0OiBmYWxzZSwgbWVzc2FnZTogJ9Cf0LDRgNC+0LvQuCDQvdC1INGB0L7QstC/0LDQtNCw0Y7Rgid9XSk7XG4gICAgaWYgKCFmb3Jnb3RFbWFpbFRva2VuKSByZXR1cm4gcmVzLnN0YXR1cyg0MDApLmpzb24oW3tyZXNldDogZmFsc2UsIG1lc3NhZ2U6ICfQn9Cw0YDQsNC80LXRgtGAIGZvcmdvdEVtYWlsVG9rZW4g0L3QtSDQv9C10YDQtdC00LDQvSd9XSk7XG5cbiAgICBjb25zdCBjcml0ZXJpYSA9IHsgZm9yZ290RW1haWxUb2tlbiB9O1xuICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBVc2VyLmZpbmRPbmUoY3JpdGVyaWEpO1xuICAgIGlmICghdXNlcikgcmV0dXJuIHJlcy5zdGF0dXMoNDA0KS5qc29uKFt7cmVzZXQ6IGZhbHNlLCBtZXNzYWdlOiAn0J3QtSDQutC+0YDRgNC10LrRgtC90YvQuSDRgtC+0LrQtdC9J31dKTtcbiAgICB1c2VyLmZvcmdvdEVtYWlsVG9rZW4gPSAnJztcbiAgICB1c2VyLnBhc3N3b3JkID0gcGFzc3dvcmQ7XG5cbiAgICBhd2FpdCB1c2VyLnNhdmUoKTtcblxuICAgIHJldHVybiByZXMuanNvbihbe1xuICAgICAgX19wYWNrOiAxLFxuICAgICAgcmVzZXQ6IHRydWVcbiAgICB9XSlcbiAgfVxuXG4gIGNvbnRyb2xsZXIuZ2V0VG9rZW4gPSBmdW5jdGlvbiAocmVxKSB7XG4gICAgaWYgKHJlcS5oZWFkZXJzLmF1dGhvcml6YXRpb24gJiYgcmVxLmhlYWRlcnMuYXV0aG9yaXphdGlvbi5zcGxpdCggJyAnIClbIDAgXSA9PT0gJ0JlYXJlcicpIHtcbiAgICAgIHJldHVybiByZXEuaGVhZGVycy5hdXRob3JpemF0aW9uLnNwbGl0KCAnICcgKVsgMSBdXG4gICAgfSBlbHNlIGlmIChyZXEuaGVhZGVyc1sneC1hY2Nlc3MtdG9rZW4nXSkge1xuICAgICAgcmV0dXJuIHJlcS5oZWFkZXJzWyd4LWFjY2Vzcy10b2tlbiddO1xuICAgIH0gZWxzZSBpZiAoIHJlcS5xdWVyeSAmJiByZXEucXVlcnkudG9rZW4gKSB7XG4gICAgICByZXR1cm4gcmVxLnF1ZXJ5LnRva2VuXG4gICAgfSBlbHNlIGlmICggcmVxLmNvb2tpZXMgJiYgcmVxLmNvb2tpZXMudG9rZW4gICkge1xuICAgICAgcmV0dXJuIHJlcS5jb29raWVzLnRva2VuXG4gICAgfVxuICAgIGlmIChfX0RFVl9fICYmIGN0eC5jb25maWcgJiYgY3R4LmNvbmZpZy5qd3QgJiYgY3R4LmNvbmZpZy5qd3QuZGV2VG9rZW4pIHJldHVybiBjdHguY29uZmlnLmp3dC5kZXZUb2tlblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29udHJvbGxlci5wYXJzZVRva2VuID0gZnVuY3Rpb24gKHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgY29uc3QgdG9rZW4gPSBjb250cm9sbGVyLmdldFRva2VuKHJlcSlcbiAgICByZXEudG9rZW4gPSB0b2tlblxuICAgIG5leHQoKVxuICB9XG5cbiAgY29udHJvbGxlci5wYXJzZVVzZXIgPSBmdW5jdGlvbiAocmVxLCByZXMsIG5leHQpIHtcbiAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgc2VjcmV0OiBjdHguY29uZmlnICYmIGN0eC5jb25maWcuand0LnNlY3JldCB8fCAnU0VDUkVUJyxcbiAgICAgIGdldFRva2VuOiByZXEgPT4gcmVxLnRva2VuLFxuICAgIH1cbiAgICBqd3Qob3B0aW9ucykocmVxLCByZXMsIChlcnIpID0+IHtcbiAgICAgIGlmIChlcnIpIHJlcS5fZXJySnd0ID0gZXJyXG4gICAgICBuZXh0KClcbiAgICB9KVxuICB9XG5cbiAgY29udHJvbGxlci5pc0F1dGggPSBmdW5jdGlvbiAocmVxLCByZXMsIG5leHQpIHtcbiAgICBpZiAocmVxLl9lcnJKd3QpIHJldHVybiBuZXh0KHJlcS5fZXJySnd0KVxuICAgIGlmICghcmVxLnVzZXIgfHwgIXJlcS51c2VyLl9pZCkgcmV0dXJuIHJlcy5zdGF0dXMoNDAxKS5zZW5kKCchcmVxLnVzZXInKVxuICAgIG5leHQoKVxuICB9XG5cbiAgcmV0dXJuIGNvbnRyb2xsZXJcbn1cbiIsImltcG9ydCB1bmlxaWQgZnJvbSAndW5pcWlkJztcblxuZXhwb3J0IGRlZmF1bHQgKGN0eCkgPT4ge1xuICBjb25zdCBVc2VyID0gY3R4Lm1vZGVscy5Vc2VyO1xuXG4gIGxldCBjb250cm9sbGVyID0ge307XG5cbiAgY29udHJvbGxlci5nZXQgPSBhc3luYyBmdW5jdGlvbihyZXEsIHJlcykge1xuICAgIGNvbnN0IHVzZXJJRCA9IHJlcS51c2VyLmlkO1xuICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBVc2VyLmZpbmRPbmUoe2lkOiB1c2VySUR9KTtcblxuICAgIHJldHVybiByZXMuanNvbih1c2VyKTtcbiAgfVxuXG4gIGNvbnRyb2xsZXIuZ2V0V29ya3MgPSBhc3luYyBmdW5jdGlvbihyZXEsIHJlcykge1xuICAgIGNvbnN0IHVzZXJJRCA9IHJlcS5wYXJhbXMuaWQ7XG4gICAgY29uc3QgdXNlciA9IGF3YWl0IFVzZXIuZmluZE9uZSh7IGlkOiB1c2VySUQgfSk7XG5cbiAgICByZXR1cm4gcmVzLmpzb24odXNlci53b3Jrcyk7XG4gIH1cblxuICBjb250cm9sbGVyLmFkZFdvcmsgPSBhc3luYyBmdW5jdGlvbihyZXEsIHJlcykge1xuICAgIGNvbnN0IHBhcmFtcyA9IHJlcS5ib2R5XG4gICAgaWYgKCFwYXJhbXMudGl0bGUpIHtcbiAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbihbe3NpZ251cDogZmFsc2UsIG1lc3NhZ2U6ICfQl9Cw0L/QvtC70L3QuNGC0LUg0LLRgdC1INC/0L7Qu9GPJ31dKTtcbiAgICB9XG4gICAgaWYgKCFwYXJhbXMudGVjaG5vbG9naWVzKSB7XG4gICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDApLmpzb24oW3tzaWdudXA6IGZhbHNlLCBtZXNzYWdlOiAn0JfQsNC/0L7Qu9C90LjRgtC1INCy0YHQtSDQv9C+0LvRjyd9XSk7XG4gICAgfVxuICAgIGlmICghcGFyYW1zLmltZ1VybCkge1xuICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKFt7c2lnbnVwOiBmYWxzZSwgbWVzc2FnZTogJ9CX0LDQv9C+0LvQvdC40YLQtSDQstGB0LUg0L/QvtC70Y8nfV0pO1xuICAgIH1cblxuICAgIGNvbnN0IHsgdGl0bGUsIHRlY2hub2xvZ2llcywgaW1nVXJsLCB9ID0gcGFyYW1zO1xuXG4gICAgY29uc3QgdXNlcklEID0gcmVxLnVzZXIuaWQ7XG4gICAgY29uc3QgdXNlciA9IGF3YWl0IFVzZXIuZmluZE9uZSh7aWQ6IHVzZXJJRH0pO1xuXG4gICAgY29uc3Qgd29yayA9IHtcbiAgICAgIGlkOiB1bmlxaWQoKSxcbiAgICAgIHRpdGxlLFxuICAgICAgdGVjaG5vbG9naWVzLFxuICAgICAgaW1nVXJsLFxuICAgIH1cblxuICAgIHVzZXIud29ya3MucHVzaCh3b3JrKTtcbiAgICBhd2FpdCB1c2VyLnNhdmUoKTtcblxuICAgIHJldHVybiByZXMuanNvbihbeyBmbGFnOiB0cnVlLCBtZXNzYWdlOiAn0J/RgNC+0LXQutGCINGD0YHQv9C10YjQvdC+INC00L7QsdCw0LLQu9C10L0nfV0pO1xuICB9XG5cblxuICBjb250cm9sbGVyLmdldFBvc3RzID0gYXN5bmMgZnVuY3Rpb24ocmVxLCByZXMpIHtcbiAgICBjb25zdCB1c2VySUQgPSByZXEucGFyYW1zLmlkO1xuICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBVc2VyLmZpbmRPbmUoeyBpZDogdXNlcklEIH0pO1xuXG4gICAgcmV0dXJuIHJlcy5qc29uKHVzZXIucG9zdHMpO1xuICB9XG5cbiAgY29udHJvbGxlci5hZGRQb3N0ID0gYXN5bmMgZnVuY3Rpb24ocmVxLCByZXMpIHtcbiAgICBjb25zdCBwYXJhbXMgPSByZXEuYm9keVxuICAgIGlmICghcGFyYW1zLnRpdGxlKSB7XG4gICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDApLmpzb24oW3tzaWdudXA6IGZhbHNlLCBtZXNzYWdlOiAn0JfQsNC/0L7Qu9C90LjRgtC1INCy0YHQtSDQv9C+0LvRjyd9XSk7XG4gICAgfVxuICAgIGlmICghcGFyYW1zLmRhdGUpIHtcbiAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbihbe3NpZ251cDogZmFsc2UsIG1lc3NhZ2U6ICfQl9Cw0L/QvtC70L3QuNGC0LUg0LLRgdC1INC/0L7Qu9GPJ31dKTtcbiAgICB9XG4gICAgaWYgKCFwYXJhbXMudGV4dCkge1xuICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKFt7c2lnbnVwOiBmYWxzZSwgbWVzc2FnZTogJ9CX0LDQv9C+0LvQvdC40YLQtSDQstGB0LUg0L/QvtC70Y8nfV0pO1xuICAgIH1cblxuICAgIGNvbnN0IHsgdGl0bGUsIGRhdGUsIHRleHQsIH0gPSBwYXJhbXM7XG5cbiAgICBjb25zdCB1c2VySUQgPSByZXEudXNlci5pZDtcbiAgICBjb25zdCB1c2VyID0gYXdhaXQgVXNlci5maW5kT25lKHtpZDogdXNlcklEfSk7XG5cbiAgICBjb25zdCBwb3N0ID0ge1xuICAgICAgaWQ6IHVuaXFpZCgpLFxuICAgICAgdGl0bGUsXG4gICAgICBkYXRlLFxuICAgICAgdGV4dCxcbiAgICB9XG5cbiAgICB1c2VyLnBvc3RzLnB1c2gocG9zdCk7XG4gICAgYXdhaXQgdXNlci5zYXZlKCk7XG5cbiAgICByZXR1cm4gcmVzLmpzb24oW3sgZmxhZzogdHJ1ZSwgbWVzc2FnZTogJ9Cf0L7RgdGCINGD0YHQv9C10YjQvdC+INC00L7QsdCw0LLQu9C10L0nfV0pO1xuICB9XG5cblxuICByZXR1cm4gY29udHJvbGxlclxufVxuIiwiaW1wb3J0IEF1dGggZnJvbSAnLi9BdXRoL2luZGV4JztcbmltcG9ydCBVc2VyIGZyb20gJy4vVXNlci9pbmRleCc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICBBdXRoOiBBdXRoKC4uLmFyZ3VtZW50cyksXG4gICAgVXNlcjogVXNlciguLi5hcmd1bWVudHMpLFxuICB9XG59XG4iLCJpbXBvcnQgbm9kZW1haWxlciBmcm9tICdub2RlbWFpbGVyJztcbmltcG9ydCBzbXRwVHJhbnNwb3J0IGZyb20gJ25vZGVtYWlsZXItc210cC10cmFuc3BvcnQnO1xuXG5leHBvcnQgZGVmYXVsdCAoY3R4KSA9PiB7XG4gIGlmICghY3R4LmxvZykgdGhyb3cgJyFsb2cnXG5cbiAgY29uc3QgdHJhbnNwb3J0ZXIgPSBub2RlbWFpbGVyLmNyZWF0ZVRyYW5zcG9ydChzbXRwVHJhbnNwb3J0KGN0eC5jb25maWcubm9kZW1haWxlcikpO1xuXG4gIHJldHVybiAgdHJhbnNwb3J0ZXI7XG59XG4iLCJpbXBvcnQgVHJhbnNwb3J0ZXIgZnJvbSAnLi9Ob2RlbWFpbGVyL2luZGV4JztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKCkge1xuICByZXR1cm4ge1xuICAgIFRyYW5zcG9ydGVyOiBUcmFuc3BvcnRlciguLi5hcmd1bWVudHMpLFxuICB9XG59XG4iLCJpbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHsgQXN5bmNSb3V0ZXIgfSBmcm9tICdleHByZXNzLWFzeW5jLXJvdXRlcic7XG5cbmV4cG9ydCBkZWZhdWx0IChjdHgpID0+IHtcbiAgaWYgKCFfLmhhcyhjdHgsICdjb250cm9sbGVycy5BdXRoLnNpZ251cCcpKSB0aHJvdyAnIWNvbnRyb2xsZXJzLkF1dGguc2lnbnVwJ1xuICBpZiAoIV8uaGFzKGN0eCwgJ2NvbnRyb2xsZXJzLkF1dGguc2lnbmluJykpIHRocm93ICchY29udHJvbGxlcnMuQXV0aC5zaWduaW4nXG4gIGlmICghXy5oYXMoY3R4LCAnY29udHJvbGxlcnMuQXV0aC52YWxpZGF0ZScpKSB0aHJvdyAnIWNvbnRyb2xsZXJzLkF1dGgudmFsaWRhdGUnXG4gIGlmICghXy5oYXMoY3R4LCAnY29udHJvbGxlcnMuQXV0aC5mb3Jnb3QnKSkgdGhyb3cgJyFjb250cm9sbGVycy5BdXRoLmZvcmdvdCdcbiAgaWYgKCFfLmhhcyhjdHgsICdjb250cm9sbGVycy5BdXRoLmNoZWNrRm9yZ290VG9rZW4nKSkgdGhyb3cgJyFjb250cm9sbGVycy5BdXRoLmNoZWNrRm9yZ290VG9rZW4nXG4gIGlmICghXy5oYXMoY3R4LCAnY29udHJvbGxlcnMuQXV0aC5yZXNldCcpKSB0aHJvdyAnIWNvbnRyb2xsZXJzLkF1dGgucmVzZXQnXG5cblx0Y29uc3QgYXBpID0gQXN5bmNSb3V0ZXIoKTtcblxuICBhcGkuYWxsKCcvdmFsaWRhdGUnLCBjdHguY29udHJvbGxlcnMuQXV0aC52YWxpZGF0ZSk7XG4gIGFwaS5wb3N0KCcvc2lnbnVwJywgY3R4LmNvbnRyb2xsZXJzLkF1dGguc2lnbnVwKTtcbiAgYXBpLnBvc3QoJy9zaWduaW4nLCBjdHguY29udHJvbGxlcnMuQXV0aC5zaWduaW4pO1xuICBhcGkucG9zdCgnL2ZvcmdvdCcsIGN0eC5jb250cm9sbGVycy5BdXRoLmZvcmdvdCk7XG4gIGFwaS5nZXQoJy9mb3Jnb3QvOmZvcmdvdEVtYWlsVG9rZW4nLCBjdHguY29udHJvbGxlcnMuQXV0aC5jaGVja0ZvcmdvdFRva2VuKTtcbiAgYXBpLnBvc3QoJy9yZXNldCcsIGN0eC5jb250cm9sbGVycy5BdXRoLnJlc2V0KTtcblxuXHRyZXR1cm4gYXBpO1xufVxuIiwiaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcblxuaW1wb3J0IHsgQXN5bmNSb3V0ZXIgfSBmcm9tICdleHByZXNzLWFzeW5jLXJvdXRlcic7XG5cbmV4cG9ydCBkZWZhdWx0IChjdHgpID0+IHtcbiAgaWYgKCFfLmhhcyhjdHgsICdjb250cm9sbGVycy5Vc2VyLmdldCcpKSB0aHJvdyAnIWNvbnRyb2xsZXJzLlVzZXIuZ2V0J1xuICBpZiAoIV8uaGFzKGN0eCwgJ2NvbnRyb2xsZXJzLlVzZXIuZ2V0V29ya3MnKSkgdGhyb3cgJyFjb250cm9sbGVycy5Vc2VyLmdldFdvcmtzJ1xuICBpZiAoIV8uaGFzKGN0eCwgJ2NvbnRyb2xsZXJzLlVzZXIuYWRkV29yaycpKSB0aHJvdyAnIWNvbnRyb2xsZXJzLlVzZXIuYWRkV29yaydcbiAgaWYgKCFfLmhhcyhjdHgsICdjb250cm9sbGVycy5Vc2VyLmdldFBvc3RzJykpIHRocm93ICchY29udHJvbGxlcnMuVXNlci5nZXRQb3N0cydcbiAgaWYgKCFfLmhhcyhjdHgsICdjb250cm9sbGVycy5Vc2VyLmFkZFBvc3QnKSkgdGhyb3cgJyFjb250cm9sbGVycy5Vc2VyLmFkZFBvc3QnXG5cblx0Y29uc3QgYXBpID0gQXN5bmNSb3V0ZXIoKTtcblxuICBhcGkuZ2V0KCcvJywgY3R4LmNvbnRyb2xsZXJzLlVzZXIuZ2V0KTtcbiAgYXBpLmdldCgnLzppZC93b3JrcycsIGN0eC5jb250cm9sbGVycy5Vc2VyLmdldFdvcmtzKTtcbiAgYXBpLnBvc3QoJy86aWQvd29ya3MnLCBjdHguY29udHJvbGxlcnMuVXNlci5hZGRXb3JrKTtcbiAgYXBpLmdldCgnLzppZC9wb3N0cycsIGN0eC5jb250cm9sbGVycy5Vc2VyLmdldFBvc3RzKTtcbiAgYXBpLnBvc3QoJy86aWQvcG9zdHMnLCBjdHguY29udHJvbGxlcnMuVXNlci5hZGRQb3N0KTtcblxuXHRyZXR1cm4gYXBpO1xufVxuIiwiaW1wb3J0IHsgQXN5bmNSb3V0ZXIgfSBmcm9tICdleHByZXNzLWFzeW5jLXJvdXRlcic7XG5pbXBvcnQgZXhwcmVzc0p3dCBmcm9tICdleHByZXNzLWp3dCc7XG5pbXBvcnQgZ2V0QXV0aCBmcm9tICcuL2F1dGgvaW5kZXgnO1xuaW1wb3J0IGdldFVzZXIgZnJvbSAnLi91c2VyL2luZGV4JztcblxuXG5leHBvcnQgZGVmYXVsdCAoY3R4KSA9PiB7XG5cdGNvbnN0IGFwaSA9IEFzeW5jUm91dGVyKCk7XG5cbiAgYXBpLmFsbCgnLycsICgpID0+ICh7b2s6IHRydWUsIHZlcnNpb246ICcxLjAuMCd9KSlcblxuICBhcGkudXNlKCcvYXV0aCcsIGdldEF1dGgoY3R4KSk7XG5cdGFwaS51c2UoJy91c2VycycsIGV4cHJlc3NKd3Qoe3NlY3JldDogY3R4LmNvbmZpZy5qd3Quc2VjcmV0fSksIGdldFVzZXIoY3R4KSk7XG5cblx0Ly8gYXBpLnVzZSgnLycsIChlcnIsIHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gIC8vICAgY29uc29sZS5sb2coZXJyKTtcblx0Ly8gXHRyZXR1cm4gcmVzLnN0YXR1cyg0MDEpLmpzb24oW3sgZmxhZzogZmFsc2UsIG1lc3NhZ2U6ICfQndC1INCw0LLRgtC+0YDQuNC30L7QstCw0L0nIH1dKVxuXHQvLyB9KVxuXG5cdHJldHVybiBhcGk7XG59XG4iLCJpbXBvcnQgYnVueWFuIGZyb20gJ2J1bnlhbic7XG5pbXBvcnQgZXhwcmVzcyBmcm9tICdleHByZXNzJztcbmltcG9ydCBtb25nb29zZSBmcm9tICdtb25nb29zZSc7XG5cbmltcG9ydCBnZXRNaWRkbGV3YXJlcyBmcm9tICcuL21pZGRsZXdhcmVzL2luZGV4JztcbmltcG9ydCBnZXRNb2RlbHMgZnJvbSAnLi9tb2RlbHMvaW5kZXgnO1xuaW1wb3J0IGdldENvbnRyb2xsZXJzIGZyb20gJy4vY29udHJvbGxlcnMvaW5kZXgnO1xuaW1wb3J0IGdldFV0aWxzIGZyb20gJy4vdXRpbHMvaW5kZXgnO1xuaW1wb3J0IGdldEFwaSBmcm9tICcuL2FwaS9hcGknO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBcHAge1xuICBjb25zdHJ1Y3RvcihwYXJhbXMgPSB7fSkge1xuICAgIE9iamVjdC5hc3NpZ24odGhpcywgcGFyYW1zKTtcbiAgICBpZiAoIXRoaXMubG9nKSB0aGlzLmxvZyA9IHRoaXMuZ2V0TG9nZ2VyKCk7XG4gICAgdGhpcy5pbml0KCk7XG4gIH1cblxuICBnZXRMb2dnZXIocGFyYW1zKSB7XG4gICAgcmV0dXJuIGJ1bnlhbi5jcmVhdGVMb2dnZXIoT2JqZWN0LmFzc2lnbih7XG4gICAgICBuYW1lOiAnYXBwJyxcbiAgICAgIHNyYzogX19ERVZfXyxcbiAgICAgIGxldmVsOiAndHJhY2UnLFxuICAgIH0sIHBhcmFtcykpXG4gIH1cblxuICBnZXRNaWRkbGV3YXJlcygpIHtcbiAgICByZXR1cm4gZ2V0TWlkZGxld2FyZXModGhpcyk7XG4gIH1cblxuICBnZXRNb2RlbHMoKSB7XG4gICAgcmV0dXJuIGdldE1vZGVscyh0aGlzKTtcbiAgfVxuXG4gIGdldERhdGFiYXNlKCkge1xuICAgIHJldHVybiB7XG4gICAgICBydW46ICgpID0+IHtcbiAgICAgICAgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICBtb25nb29zZS5jb25uZWN0KHRoaXMuY29uZmlnLmRiLnVybCwge3VzZU5ld1VybFBhcnNlcjogdHJ1ZX0pO1xuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZ2V0Q29udHJvbGxlcnMoKSB7XG4gICAgcmV0dXJuIGdldENvbnRyb2xsZXJzKHRoaXMpO1xuICB9XG5cbiAgZ2V0VXRpbHMoKSB7XG4gICAgcmV0dXJuIGdldFV0aWxzKHRoaXMpO1xuICB9XG5cbiAgaW5pdCgpIHtcbiAgICB0aGlzLmxvZy50cmFjZSgnQXBwIGluaXQnKTtcbiAgICB0aGlzLmFwcCA9IGV4cHJlc3MoKTtcbiAgICB0aGlzLmRiID0gdGhpcy5nZXREYXRhYmFzZSgpO1xuXG4gICAgdGhpcy51dGlscyA9IHRoaXMuZ2V0VXRpbHMoKTtcbiAgICB0aGlzLmxvZy50cmFjZSgndXRpbHMnLCBPYmplY3Qua2V5cyh0aGlzLnV0aWxzKSk7XG5cbiAgICB0aGlzLm1pZGRsZXdhcmVzID0gdGhpcy5nZXRNaWRkbGV3YXJlcygpO1xuICAgIHRoaXMubG9nLnRyYWNlKCdtaWRkbGV3YXJlcycsIE9iamVjdC5rZXlzKHRoaXMubWlkZGxld2FyZXMpKTtcblxuICAgIHRoaXMubW9kZWxzID0gdGhpcy5nZXRNb2RlbHMoKTtcbiAgICB0aGlzLmxvZy50cmFjZSgnbW9kZWxzJywgT2JqZWN0LmtleXModGhpcy5tb2RlbHMpKTtcblxuICAgIHRoaXMuY29udHJvbGxlcnMgPSB0aGlzLmdldENvbnRyb2xsZXJzKCk7XG4gICAgdGhpcy5sb2cudHJhY2UoJ2NvbnRyb2xsZXJzJywgT2JqZWN0LmtleXModGhpcy5jb250cm9sbGVycykpO1xuXG4gICAgdGhpcy51c2VNaWRkbGV3YXJlcygpO1xuICAgIHRoaXMudXNlUm91dGVzKCk7XG4gICAgdGhpcy51c2VEZWZhdWx0Um91dGUoKTtcbiAgfVxuXG4gIHVzZU1pZGRsZXdhcmVzKCkge1xuICAgIHRoaXMuYXBwLnVzZSh0aGlzLm1pZGRsZXdhcmVzLmNhdGNoRXJyb3IpO1xuICAgIHRoaXMuYXBwLnVzZSh0aGlzLm1pZGRsZXdhcmVzLnJlcUxvZyk7XG4gICAgdGhpcy5hcHAudXNlKHRoaXMubWlkZGxld2FyZXMuYWNjZXNzTG9nZ2VyKTtcbiAgICB0aGlzLmFwcC51c2UodGhpcy5taWRkbGV3YXJlcy5yZXFQYXJzZXIpO1xuXG4gICAgdGhpcy5hcHAudXNlKHRoaXMuY29udHJvbGxlcnMuQXV0aC5wYXJzZVRva2VuKTtcbiAgICB0aGlzLmFwcC51c2UodGhpcy5jb250cm9sbGVycy5BdXRoLnBhcnNlVXNlcik7XG4gIH1cblxuICB1c2VSb3V0ZXMoKSB7XG4gICAgY29uc3QgYXBpID0gZ2V0QXBpKHRoaXMpO1xuICAgIHRoaXMuYXBwLnVzZSgnL2FwaS92MScsIGFwaSk7XG4gIH1cblxuICB1c2VEZWZhdWx0Um91dGUoKSB7XG4gICAgdGhpcy5hcHAudXNlKChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgY29uc3QgZXJyID0gKCdSb3V0ZSBub3QgZm91bmQnKTtcbiAgICAgIG5leHQoZXJyKTtcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIHJ1bigpIHtcbiAgICB0aGlzLmxvZy50cmFjZSgnQXBwIHJ1bicpO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLmRiLnJ1bigpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy5sb2cuZmF0YWwoZXJyKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICB0aGlzLmFwcC5saXN0ZW4odGhpcy5jb25maWcucG9ydCwgKCkgPT4ge1xuICAgICAgICB0aGlzLmxvZy5pbmZvKGBBcHAgXCIke3RoaXMuY29uZmlnLm5hbWV9XCIgcnVubmluZyBvbiBwb3J0ICR7dGhpcy5jb25maWcucG9ydH0hYCk7XG4gICAgICAgIHJlc29sdmUodGhpcyk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufVxuIiwiaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZy9pbmRleCc7XG5pbXBvcnQgQXBwIGZyb20gJy4vQXBwJztcblxuY29uc3QgYXBwID0gbmV3IEFwcCh7IGNvbmZpZyB9KTtcbmFwcC5ydW4oKTtcblxuIl0sIm5hbWVzIjpbImdsb2JhbCIsIl9fREVWX18iLCJfX1BST0RfXyIsIm5hbWUiLCJwb3J0IiwiZGIiLCJ1cmwiLCJqd3QiLCJzZWNyZXQiLCJub2RlbWFpbGVyIiwic2VydmljZSIsImhvc3QiLCJhdXRoIiwidXNlciIsInBhc3MiLCJsZXZlbEZuIiwiZGF0YSIsImVyciIsInN0YXR1cyIsImR1cmF0aW9uIiwibG9nU3RhcnQiLCJsZWZ0UGFkIiwibWV0aG9kIiwicmVxSWQiLCJsb2dGaW5pc2giLCJ0aW1lIiwidG9GaXhlZCIsImxlbmd0aCIsInBhcmFtcyIsInJlcSIsInJlcyIsIm5leHQiLCJsb2ciLCJjaGlsZCIsImNvbXBvbmVudCIsIndzIiwiaGVhZGVycyIsImJhc2VVcmwiLCJyZWZlcmVyIiwiaGVhZGVyIiwiaXAiLCJjb25uZWN0aW9uIiwicmVtb3RlQWRkcmVzcyIsInNvY2tldCIsImRlYnVnIiwiYm9keSIsInRyYWNlIiwiSlNPTiIsInN0cmluZ2lmeSIsImhydGltZSIsInByb2Nlc3MiLCJsb2dnaW5nIiwic3RhdHVzQ29kZSIsImdldEhlYWRlciIsImRpZmYiLCJvbiIsImN0eCIsImJvZHlQYXJzZXIiLCJqc29uIiwidXJsZW5jb2RlZCIsImV4dGVuZGVkIiwiY29va2llUGFyc2VyIiwiY29ycyIsImVycm9yIiwicXVlcnkiLCJzdGFjayIsImNvbnNvbGUiLCJ1dWlkIiwidjQiLCJyZXF1ZXN0cyIsIl8iLCJmb3JFYWNoIiwidmFsIiwia2V5IiwiYmluZCIsInJlc3BvbnNlcyIsImFjY2Vzc0xvZ2dlciIsImFyZ3VtZW50cyIsInJlcVBhcnNlciIsImNhdGNoRXJyb3IiLCJyZXFMb2ciLCJleHRlbmRSZXFSZXMiLCJXb3Jrc1NjaGVtYSIsIm1vbmdvb3NlIiwiU2NoZW1hIiwiaWQiLCJ0eXBlIiwiU3RyaW5nIiwidHJpbSIsInRpdGxlIiwicmVxdWlyZWQiLCJ0ZWNobm9sb2dpZXMiLCJpbWdVcmwiLCJQb3N0U2NoZW1hIiwiZGF0ZSIsIk51bWJlciIsInRleHQiLCJTa2lsbFNjaGVtYSIsImdyb3VwSWQiLCJ2YWx1ZSIsIkdyb3Vwc1NraWxscyIsInNraWxscyIsImJjcnlwdEdlblNhbHQiLCJQcm9taXNlIiwicHJvbWlzaWZ5IiwiYmNyeXB0IiwiZ2VuU2FsdCIsImJjcnlwdEhhc2giLCJoYXNoIiwiYmNyeXB0Q29tcGFyZSIsImNvbXBhcmUiLCJzY2hlbWEiLCJlbWFpbCIsInBhc3N3b3JkIiwiZm9yZ290RW1haWxUb2tlbiIsIndvcmtzIiwiV29ya1NjaGVtYSIsInBvc3RzIiwiZ3JvdXBzU2tpbGxzIiwiY29sbGVjdGlvbiIsInRpbWVzdGFtcHMiLCJzdGF0aWNzIiwiaXNWYWxpZEVtYWlsIiwicmUiLCJ0ZXN0IiwiZ2VuZXJhdGVQYXNzd29yZCIsIk1hdGgiLCJyYW5kb20iLCJ0b1N0cmluZyIsInN1YnN0ciIsIm1ldGhvZHMiLCJ0b0pTT04iLCJvbWl0IiwidG9PYmplY3QiLCJnZXRJZGVudGl0eSIsIm9iamVjdCIsInBpY2siLCJPYmplY3QiLCJhc3NpZ24iLCJnZW5lcmF0ZUF1dGhUb2tlbiIsInNpZ24iLCJjb25maWciLCJ2ZXJpZnlQYXNzd29yZCIsIlNBTFRfV09SS19GQUNUT1IiLCJwcmUiLCJpc01vZGlmaWVkIiwidGhlbiIsInNhbHQiLCJtb2RlbCIsIlVzZXIiLCJtb2RlbHMiLCJ0cmFuc3BvcnRlciIsInV0aWxzIiwiVHJhbnNwb3J0ZXIiLCJjb250cm9sbGVyIiwidmFsaWRhdGUiLCJmaW5kT25lIiwibWVzc2FnZSIsIl9fcGFjayIsImdldFVzZXJGaWVsZHMiLCJ2YWxpZGF0aW9uVXNlckZpZWxkcyIsInVzZXJGaWVsZHMiLCJ2YWxpZCIsImlzVmFsaWQiLCJjYXB0Y2hhIiwic2lnbnVwIiwiZ2V0VXNlckNyaXRlcmlhIiwiY3JpdGVyaWEiLCJleGlzdFVzZXIiLCJ1bmlxaWQiLCJzYXZlIiwicmVzdWx0IiwidG9rZW4iLCJzaWduaW4iLCJsb2dpbiIsImZvcmdvdCIsImNyeXB0byIsInJhbmRvbUJ5dGVzIiwic2l0ZVVybCIsIm1haWxUZXh0IiwibWFpbE9wdGlvbnMiLCJmcm9tIiwidG8iLCJzdWJqZWN0Iiwic2VuZE1haWwiLCJjaGVja0ZvcmdvdFRva2VuIiwicmVzZXQiLCJjaGVja1Bhc3N3b3JkIiwiZ2V0VG9rZW4iLCJhdXRob3JpemF0aW9uIiwic3BsaXQiLCJjb29raWVzIiwiZGV2VG9rZW4iLCJwYXJzZVRva2VuIiwicGFyc2VVc2VyIiwib3B0aW9ucyIsIl9lcnJKd3QiLCJpc0F1dGgiLCJfaWQiLCJzZW5kIiwiZ2V0IiwidXNlcklEIiwiZ2V0V29ya3MiLCJhZGRXb3JrIiwid29yayIsInB1c2giLCJmbGFnIiwiZ2V0UG9zdHMiLCJhZGRQb3N0IiwicG9zdCIsIkF1dGgiLCJjcmVhdGVUcmFuc3BvcnQiLCJzbXRwVHJhbnNwb3J0IiwiaGFzIiwiYXBpIiwiQXN5bmNSb3V0ZXIiLCJhbGwiLCJjb250cm9sbGVycyIsIm9rIiwidmVyc2lvbiIsInVzZSIsImdldEF1dGgiLCJleHByZXNzSnd0IiwiZ2V0VXNlciIsIkFwcCIsImdldExvZ2dlciIsImluaXQiLCJidW55YW4iLCJjcmVhdGVMb2dnZXIiLCJzcmMiLCJsZXZlbCIsImdldE1pZGRsZXdhcmVzIiwiZ2V0TW9kZWxzIiwicnVuIiwicmVzb2x2ZSIsImNvbm5lY3QiLCJ1c2VOZXdVcmxQYXJzZXIiLCJnZXRDb250cm9sbGVycyIsImdldFV0aWxzIiwiYXBwIiwiZXhwcmVzcyIsImdldERhdGFiYXNlIiwia2V5cyIsIm1pZGRsZXdhcmVzIiwidXNlTWlkZGxld2FyZXMiLCJ1c2VSb3V0ZXMiLCJ1c2VEZWZhdWx0Um91dGUiLCJnZXRBcGkiLCJmYXRhbCIsImxpc3RlbiIsImluZm8iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxNQUFNLENBQUNDLE9BQVAsR0FBaUIsS0FBakI7O0FBRUFELE1BQU0sQ0FBQ0UsUUFBUCxHQUFrQixJQUFsQjtBQUVBLGFBQWU7RUFDYkMsSUFBSSxFQUFFLGdCQURPO0VBRWJDLElBQUksRUFBRSxJQUZPO0VBR2JDLEVBQUUsRUFBRTtJQUNGQyxHQUFHLEVBQUU7R0FKTTtFQU1iQyxHQUFHLEVBQUU7SUFDSEMsTUFBTSxFQUFFO0dBUEc7RUFTYkMsVUFBVSxFQUFFO0lBQ1ZDLE9BQU8sRUFBRSxNQURDO0lBRVZDLElBQUksRUFBRSxjQUZJO0lBR1ZDLElBQUksRUFBRTtNQUNKQyxJQUFJLEVBQUUsdUJBREY7TUFFSkMsSUFBSSxFQUFFOzs7Q0FkWjs7QUNGQSxTQUFTQyxPQUFULENBQWlCQyxJQUFqQixFQUF1QjtNQUNqQkEsSUFBSSxDQUFDQyxHQUFMLElBQVlELElBQUksQ0FBQ0UsTUFBTCxJQUFlLEdBQTNCLElBQWtDRixJQUFJLENBQUNHLFFBQUwsR0FBZ0Is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
