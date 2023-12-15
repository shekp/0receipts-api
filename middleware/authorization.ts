import express from 'express';
import jwt from 'jsonwebtoken';

export async function auth(req: any, res: express.Response, next: express.NextFunction): Promise<any> {
  try {
    if (!req.headers.authorization) {
      throw { status: 401, message: 'User is not authorized' };
    }

    console.log('req.headers.authorization', req.headers.authorization);

    const token = req.headers.authorization?.replace('Bearer', '').trim();
    req.userData = jwt.verify(token || '', 'access');
    next();
  } catch (err: any) {
    console.log('err', err.message);
    if (err.message?.includes('jwt')) {
      err.status = 401;
      err.message = 'User is not authorized';
    }
    const errMsg = err.message ? err.message : err;
    res.status(err.status ? err.status : 500).json({ errCode: err.code ? err.code : -1, errMsg });
  }
}
