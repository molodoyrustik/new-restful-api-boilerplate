import { AsyncRouter } from 'express-async-router';
import expressJwt from 'express-jwt';
import getAuth from './auth/index';
import getUser from './user/index';


export default (ctx) => {
	const api = AsyncRouter();

  api.all('/', () => ({ok: true, version: '1.0.0'}))

  api.use('/auth', getAuth(ctx));
	api.use('/users', expressJwt({secret: ctx.config.jwt.secret}), getUser(ctx));

	// api.use('/', (err, req, res, next) => {
  //   console.log(err);
	// 	return res.status(401).json([{ flag: false, message: 'Не авторизован' }])
	// })

	return api;
}
