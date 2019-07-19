import jwt from 'express-jwt'
import uniqid from 'uniqid';
import crypto from 'crypto';

export function canonize(str) {
  return str.toLowerCase().trim()
}

export default (ctx) => {
  const User = ctx.models.User;

  const transporter = ctx.utils.Transporter;

  const controller = {}

  controller.validate = async function (req, res) {
    if(req.user) {
      const user = await User.findOne({id: req.user.id})
      if (!user) return res.status(404).json([{flag: false, message: 'Пользователь не найден в базе'}]);
      return [{
        flag: true,
        __pack: 1,
        jwt: req.user,
        user: user,
      }]
    }
    return res.status(404).json([{flag: false, message: 'Пользователь не найден в базе'}]);
  }

  controller.getUserFields = function (req) {
    return req.body;
  }

  controller.validationUserFields = function(userFields, res) {
    let valid = {
      isValid: false,
      message: []
    }

    if(!userFields.email || !userFields.password) {
      valid.isValid = true;
      valid.message = [{signup: false, message: 'Параметрs email или password не передан'}]
    }

    return valid;
  }

  controller.getUserCriteria = function (req, res) {
    const params = req.body
    if (params.email) {
      return {
        email: params.email,
      }
    }
    return res.status(400).json([{signup: false, message: 'Параметр email не передан'}]);
  }

  controller.signup = async function (req, res) {
    try {
      const userFields = controller.getUserFields(req, res);
      const valid = controller.validationUserFields(userFields, res);
      if (valid.isValid) {
        return res.status(400).json(valid.message);
      }
      const criteria = controller.getUserCriteria(req, res);

      const existUser = await User.findOne(criteria)
      if (existUser) return res.status(400).json([{signup: false, message: 'Такой email зарегистрирован'}]);

      const user = new User({
        ...userFields,
        id: uniqid(),
        forgotEmailToken: '',
      });

      await user.save()

      const result = [{
        signup: true,
        user,
        token: user.generateAuthToken(),
      }]

      return res.json(result)

    } catch(err) {
      console.log(err);
      return res.status(500).json(err)
    }
  }

  controller.signin = async function (req, res) {
    const params = controller.getUserFields(req, res);
    if (!params.password) return res.status(400).json([{flag: false, message: 'Параметр password не передан'}]);
    console.log(req.body);
    const criteria = controller.getUserCriteria(req);

    const user = await User.findOne(criteria);

    if (!user) return res.status(404).json([{flag: false, message: 'Такой пользователь не найден'}]);
    await user.save();

    if (!await user.verifyPassword(params.password)) {
      return res.status(400).json([{flag: false, message: 'Переданный пароль не подходит'}]);
    }

    return res.json([{
      __pack: 1,
      flag: true,
      user,
      token: user.generateAuthToken(),
    }])
  }

  controller.forgot = async function (req, res) {
    const params = controller.getUserFields(req, res);

    if (!params.email) return res.status(400).json([{ forgot: false, message: 'Параметр email не передан' }]);

    const criteria = controller.getUserCriteria(req);
    const user = await User.findOne(criteria);

    if (!user) return res.status(404).json([{login: false, message: 'Пользователь с таким email не найден в базе'}]);

    const token = await crypto.randomBytes(32);

    user.forgotEmailToken = token.toString('hex');
    await user.save();


    let siteUrl = 'http://localhost:3000/';
    if (__PROD__) {
      siteUrl = 'http://app.ashlie.io/';
    }

    let mailText = `Перейдите по ссылке чтобы изменить пароль ${siteUrl}auth/forgot/${user.forgotEmailToken}`;

    var mailOptions = {
      from: 'molodoyrustik@mail.ru',
      to: user.email,
      subject: 'Восстановления пароля сайта Ashile.io',
      text: mailText
    };
    await transporter.sendMail(mailOptions);

    const result = [{
      __pack: 1,
      forgot: true
    }];
    return res.json(result);
  }

  controller.checkForgotToken = async function (req, res) {
    const { forgotEmailToken } = req.params;

    if (!forgotEmailToken) {
      return res.status(400).json([{checkForgotToken: false, message: 'Токен не был передан'}]);
    }

    const criteria = { forgotEmailToken };
    const user = await User.findOne(criteria);

    if (!user) return res.status(404).json([{checkForgotToken: false, message: 'Пользователь с таким токеном не найден'}]);

    return res.json([{
        __pack: 1,
        checkForgotToken: true
    }]);
  }

  controller.reset = async function (req, res) {
    const params = controller.getUserFields(req, res);
    const { password, checkPassword, forgotEmailToken, } = params;

    if (!password) return res.status(400).json([{reset: false, message: 'Параметр password не передан'}]);
    if (!checkPassword) return res.status(400).json([{reset: false, message: 'Параметр checkPassword не передан'}]);
    if (password !== checkPassword) return res.status(400).json([{reset: false, message: 'Пароли не совпадают'}]);
    if (!forgotEmailToken) return res.status(400).json([{reset: false, message: 'Параметр forgotEmailToken не передан'}]);

    const criteria = { forgotEmailToken };
    const user = await User.findOne(criteria);
    if (!user) return res.status(404).json([{reset: false, message: 'Не корректный токен'}]);
    user.forgotEmailToken = '';
    user.password = password;

    await user.save();

    return res.json([{
      __pack: 1,
      reset: true
    }])
  }

  controller.getToken = function (req) {
    if (req.headers.authorization && req.headers.authorization.split( ' ' )[ 0 ] === 'Bearer') {
      return req.headers.authorization.split( ' ' )[ 1 ]
    } else if (req.headers['x-access-token']) {
      return req.headers['x-access-token'];
    } else if ( req.query && req.query.token ) {
      return req.query.token
    } else if ( req.cookies && req.cookies.token  ) {
      return req.cookies.token
    }
    if (__DEV__ && ctx.config && ctx.config.jwt && ctx.config.jwt.devToken) return ctx.config.jwt.devToken
    return null;
  }

  controller.parseToken = function (req, res, next) {
    const token = controller.getToken(req)
    req.token = token
    next()
  }

  controller.parseUser = function (req, res, next) {
    const options = {
      secret: ctx.config && ctx.config.jwt.secret || 'SECRET',
      getToken: req => req.token,
    }
    jwt(options)(req, res, (err) => {
      if (err) req._errJwt = err
      next()
    })
  }

  controller.isAuth = function (req, res, next) {
    if (req._errJwt) return next(req._errJwt)
    if (!req.user || !req.user._id) return res.status(401).send('!req.user')
    next()
  }

  return controller
}
