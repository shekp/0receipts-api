import { NextFunction, Request, Response } from 'express';
import { PoolClient } from 'pg';
import log from '../config/logger';
import pool from '../loaders/database';
import { insert_address, select_addresses } from '../db_apis/address.db';

interface AddressPostBody {
  cityCode: string;
  streetName: string;
  buildingNo: string;
  officeNo: string;
  zipCode: string;
}

async function address_post({ body }: Request<any, any, AddressPostBody>, res: Response, next: NextFunction) {
  let conn!: PoolClient;

  try {
    conn = await pool.connect();

    const addressInsertResultId = await insert_address(conn, body);
    const [createdAddress] = await select_addresses(conn, { id: addressInsertResultId.toString() });

    return res.status(200).send(createdAddress);
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

interface AddressGetParams {
  addressId: string;
}

async function address_get({ params }: Request<AddressGetParams>, res: Response, next: NextFunction) {
  let conn!: PoolClient;

  try {
    conn = await pool.connect();

    const [address] = await select_addresses(conn, { id: params.addressId });

    if (!address) {
      log.error(`Error in address get: by addressId ${params.addressId} not found rows`);

      throw new Error(`Error in address get: by addressId ${params.addressId} not found rows`);
    }

    return res.status(200).send(address);
  } catch (error: any) {
    log.error(`Error in address_get: ${JSON.stringify(error.message ? error.message : error)}`);

    if (conn) {
      await conn.query('ROLLBACK').catch((error) => {
        log.error(`Error rollback in address_get: ${JSON.stringify(error.message ? error.message : error)}`);
      });
    }

    next(error);
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

export { address_post, address_get };
