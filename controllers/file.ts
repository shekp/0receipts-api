import express from 'express';
const Minio = require('minio');

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_URL,
  port: Number(process.env.MINIO_PORT),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

import log from '../config/logger';

async function file_object_get(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const bind = { ...req.params };
    minioClient.getObject('receipt', bind.objectName, function (error: any, stream: any) {
      if (error) {
        throw error;
      }
      res.attachment(`${bind.objectName}`);
      stream.pipe(res);
    });
  } catch (error: any) {
    log.error(`Error in file_object_get: ${error.message || error}`);
    next(error);
  }
}

export { file_object_get };
