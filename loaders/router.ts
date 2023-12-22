import express from 'express';

import { auth } from '../middleware/authorization';
import { user_post, user_get, user_login, user_password, user_patch, user_logout } from '../controllers/user';
import { vendor_get, vendor_post, vendor_branch_get, vendor_branch_post, vendor_contact_get, vendor_contact_post } from '../controllers/vendor';
import {
  receipt_post,
  receipt_get,
  receipt_data_get,
  receipt_add_info_post,
  receipt_add_info_get,
  receipt_full_info_get,
  receipt_qr_post,
} from '../controllers/receipt';
import { address_get, address_post } from '../controllers/address';
import { file_object_get } from '../controllers/file';

export const routes = (app: express.Application) => {
  const api: string = '/api/v1';
  const router: express.Router = express.Router();

  router.post(`/user`, user_post);
  router.get('/user/:userId', user_get);
  router.post('/user/login', user_login);
  router.post('/user/logout', auth, user_logout);
  router.post('/user/password', auth, user_password);
  router.patch('/user/:userId', auth, user_patch);

  router.post('/vendor', auth, vendor_post);
  router.get('/vendor/:vendorId', auth, vendor_get);
  router.get('/vendor/:vendorId/branch', auth, vendor_branch_get);
  router.post('/vendor/:vendorId/branch', auth, vendor_branch_post);
  router.get('/vendor/:vendorId/contact', auth, vendor_contact_get);
  router.post('/vendor/:vendorId/contact', auth, vendor_contact_post);

  router.post('/receipt', auth, receipt_post);
  router.post('/receipt-qr', auth, receipt_qr_post);
  router.get('/receipt', auth, receipt_get);
  router.get('/receipt/:receiptId/data', auth, receipt_data_get);
  router.post('/receipt/:receiptId/add-info', auth, receipt_add_info_post);
  router.get('/receipt/:receiptId/add-info', auth, receipt_add_info_get);
  router.get('/receipt-full-info/:receiptId', auth, receipt_full_info_get);

  router.post('/address', auth, address_post);
  router.get('/address/:addressId', auth, address_get);

  router.get('/getFileObject/:objectName', file_object_get);

  app.use(api, router);
};
