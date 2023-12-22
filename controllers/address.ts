import { NextFunction, Request, Response } from 'express';
import { PoolClient } from 'pg';
import log from '../config/logger';
import pool from '../loaders/database';
import { address_get_db, address_post_db } from '../db_apis/address.db';
import { AddressGetParams, AddressPostBody } from '../interfaces/address.interface';

async function address_post({ body }: Request<any, any, AddressPostBody>, res: Response, next: NextFunction) {
  let conn!: PoolClient;

  try {
    conn = await pool.connect();

    const addressInsertResultId = await address_post_db(conn, body);
    const [createdAddress] = await address_get_db(conn, { id: addressInsertResultId });

    res.locals.data = {
      statusCode: 201,
      data: createdAddress,
    };

    next();
  } catch (error: any) {
    log.error(`Error in address_post: ${JSON.stringify(error.message ? error.message : error)}`);

    if (conn) {
      await conn.query('ROLLBACK').catch((error) => {
        log.error(`Error rollback in address_post: ${JSON.stringify(error.message ? error.message : error)}`);
      });
    }

    next(error);
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

async function address_get({ params }: Request<any, AddressGetParams>, res: Response, next: NextFunction) {
  let conn!: PoolClient;

  try {
    conn = await pool.connect();

    const [address] = await address_get_db(conn, { id: Number(params.addressId) });

    if (!address) {
      log.error(`Error in address get: by addressId ${params.addressId} not found rows`);

      throw {
        status: 404,
        message: `Error in address get: by addressId ${params.addressId} not found rows`,
      };
    }

    res.locals.data = {
      statusCode: 200,
      data: address,
    };

    next();
  } catch (error: any) {
    log.error(`Error in address_get: ${JSON.stringify(error.message ? error.message : error)}`);

    next(error);
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

export { address_post, address_get };
