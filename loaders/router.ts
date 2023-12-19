import express from 'express';

import { auth } from '../middleware/authorization';
import { user_post, user_get, user_login, user_password, user_patch } from '../controllers/user';
import { vendor_get, vendor_post, vendor_branch_get, vendor_branch_post, vendor_contact_get, vendor_contact_post } from '../controllers/vendor';
import { receipt_post, receipt_get } from '../controllers/receipt';

export const routes = (app: express.Application) => {
  const api: string = '/api/v1';
  const router: express.Router = express.Router();

  router.post(`/user`, user_post);
  router.get('/user/:id?', user_get);
  router.post('/user/login', user_login);
  router.post('/user/password', auth, user_password);
  router.patch('/user/:id?', auth, user_patch);

  router.post('/vendor', auth, vendor_post);
  router.get('/vendor/:id?', auth, vendor_get);
  router.get('/vendor/:vendorId/branch', auth, vendor_branch_get);
  router.post('/vendor/:vendorId/branch', auth, vendor_branch_post);
  router.get('/vendor/:vendorId/contact', auth, vendor_contact_get);
  router.post('/vendor/:vendorId/contact', auth, vendor_contact_post);

  router.post('/receipt', auth, receipt_post);
  router.get('/receipt', auth, receipt_get);

  app.use(api, router);
};
