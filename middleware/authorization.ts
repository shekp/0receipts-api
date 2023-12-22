import express from 'express';
import jwt from 'jsonwebtoken';

import { user_access_get } from '../controllers/user';

export async function auth(req: express.Request, res: express.Response, next: express.NextFunction): Promise<any> {
  try {
    if (!req.headers.authorization) {
      throw { status: 401, message: 'User is not authorized' };
    }

    const token = req.headers.authorization?.replace('Bearer', '').trim();
    req.body.userData = jwt.verify(token || '', `${process.env.AUTH_ACCESS_KEY}`);

    const result = await user_access_get(req.body.userData?.authUserId, token);

    if (!result) {
      throw { status: 401, message: 'User is not authorized' };
    }
    next();
  } catch (err: any) {
    if (err.message?.includes('jwt')) {
      err.status = 401;
      err.message = 'User is not authorized';
    }
    const errMsg = err.message ? err.message : err;
    res.status(err.status ? err.status : 500).json({ errCode: err.code ? err.code : -1, errMsg });
  }
}
