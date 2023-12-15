import express from 'express';

import { auth } from '../middleware/authorization';
import { user_post, user_get, user_login, user_password, user_patch } from '../controllers/user';

export const routes = (app: express.Application) => {
  const api: string = '/api/v1';
  const router: express.Router = express.Router();

  router.post(`/user`, user_post);
  router.get('/user/:id?', user_get);
  router.post('/user/login', user_login);
  router.post('/user/password', auth, user_password);
  router.patch('/user/:id?', auth, user_patch);

  app.use(api, router);
};
