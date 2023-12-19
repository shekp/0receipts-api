import express from 'express';

import { auth } from '../middleware/authorization';
import { user_post, user_get, user_login, user_password, user_patch } from '../controllers/user';
import { address_get, address_post } from '../controllers/address';

export const routes = (app: express.Application) => {
  const api: string = '/api/v1';
  const router: express.Router = express.Router();

  router.post(`/user`, user_post);
  router.get('/user/:id?', user_get);
  router.post('/user/login', user_login);
  router.post('/user/password', auth, user_password);
  router.patch('/user/:id?', auth, user_patch);

  router.post('/address', address_post);
  router.get('/address/:addressId', address_get);

  app.use(api, router);
};
