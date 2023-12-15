import express from 'express';
import cors from 'cors';
import useragent from 'express-useragent';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import multer from 'multer';

import morganMiddleware from '../config/morgan';
import { routes } from './router';

export const app: express.Application = express();

app.use(cookieParser());
app.use(
  cors({
    origin: [`${process.env.CRM_ORIGIN}`],
    credentials: true,
    exposedHeaders: ['set-cookie'],
  })
);

app.use(morganMiddleware);
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.use(useragent.express());

app.use(multer({ storage: multer.memoryStorage() }).single('file'));

routes(app);

const api: string = '/api/v1';

app.use(api, function (req: express.Request, res: express.Response, next: express.NextFunction) {
  console.log('res.locals.data', res.locals.data);
  if (res.locals.data && Object.keys(res.locals.data).length) {
    res.status(res.locals.data.statusCode).json(res.locals.data.data);
    delete res.locals.data;
  } else {
    next();
  }
});

app.use(function (err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
  res.status(err.status ? err.status : 500).json({
    errCode: err.code ? err.code : -1,
    errMsg: err.message ? err.message : err,
  });
});
