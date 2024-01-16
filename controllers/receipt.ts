import express from 'express';
import qrcode from 'qrcode';
const Minio = require('minio');

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_URL,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

import {
  receipt_post_db,
  receipt_data_post_db,
  receipt_get_db,
  receipt_data_get_db,
  receipt_add_info_post_db,
  receipt_add_info_get_db,
} from '../db_apis/receipt_db';
import { branch_get_db } from '../db_apis/branch_db';
import { vendor_get_db, vendor_icon_get_db } from '../db_apis/vendor_db';
import { user_get_db } from '../db_apis/user_db';
import { address_get_db } from '../db_apis/address.db';
import log from '../config/logger';
import pool from '../loaders/database';

async function receipt_post(req: any, res: express.Response, next: express.NextFunction) {
  let conn;
  try {
    conn = await pool.connect();

    await conn.query('BEGIN');

    const bind = { ...req.body };

    if (!bind.userId) {
      throw { status: 400, message: 'Bad request' };
    }

    const branchData = await branch_get_db(conn, { id: bind.branchId || -1 });

    const userData = await user_get_db(conn, { id: bind.userId });

    if (!userData.length) {
      throw { status: 404, message: `User with ID - ${bind.userId} not found` };
    }

    const receiptId = await receipt_post_db(conn, { ...bind, vendorId: branchData?.vendorId || -1 });

    if (bind.data && bind.dataType === 'FILE') {
      if (!bind.fileName) {
        throw { status: 400, message: `Bad request! "fileName" must be provided` };
      }
      const myBuffer = Buffer.from(bind.data, 'base64');
      await minioClient.putObject('0receipts', bind.fileName, myBuffer, { receiptId });
      delete bind.data;
      bind.fileUrl = `${process.env.API_URL}/api/v1/getFileObject/${bind.fileName}`;
    }

    await receipt_data_post_db(conn, { receiptId, ...bind });

    const receiptData = await receipt_get_db(conn, { id: receiptId });

    if (receiptData) {
      const [branchAddressData] = await address_get_db(conn, { id: branchData.addressId });
      receiptData.branchData = {
        name: branchData.name,
        address: {
          cityName: branchAddressData.cityName,
          stateName: branchAddressData.stateName,
          countryName: branchAddressData.countryName,
          streetName: branchAddressData.streetName,
          buildingNo: branchAddressData.buildingNo,
          officeNo: branchAddressData.buildingNo,
          zipCode: branchAddressData.zipCode,
        },
      };
      const vendorData = await vendor_get_db(conn, { id: branchData.vendorId });
      if (vendorData) {
        const [vendorAddressData] = await address_get_db(conn, { id: vendorData.addressId });
        const vendorIconData = await vendor_icon_get_db(conn, { vendorId: branchData.vendorId });
        receiptData.vendorData = {
          name: vendorData.name,
          address: {
            cityName: vendorAddressData.cityName,
            stateName: vendorAddressData.stateName,
            countryName: vendorAddressData.countryName,
            streetName: vendorAddressData.streetName,
            buildingNo: vendorAddressData.buildingNo,
            officeNo: vendorAddressData.buildingNo,
            zipCode: vendorAddressData.zipCode,
          },
          icons: vendorIconData?.map((item: any) => ({ id: item.id, typeCode: item.typeCode, url: item.url })),
        };
      }
    }

    await conn.query('COMMIT');

    res.locals.data = {
      statusCode: 201,
      data: receiptData,
    };

    next();
  } catch (error: any) {
    log.error(`Error in receipt_post: ${JSON.stringify(error.message ? error.message : error)}`);

    if (conn) {
      try {
        await conn.query('ROLLBACK');
      } catch (error: any) {
        log.error(`Error rollback in receipt_post: ${JSON.stringify(error.message ? error.message : error)}`);
      }
    }

    next(error);
  } finally {
    if (conn) {
      try {
        await conn.release();
      } catch (error: any) {
        log.error(`Error closing connection in receipt_post: ${JSON.stringify(error.message ? error.message : error)}`);
      }
    }
  }
}

async function receipt_qr_post(req: any, res: express.Response, next: express.NextFunction) {
  let conn;
  try {
    conn = await pool.connect();

    await conn.query('BEGIN');

    const bind = { ...req.body };

    if (!bind.userId) {
      throw { status: 400, message: 'Bad request' };
    }

    const branchData = await branch_get_db(conn, { id: bind.branchId || -1 });

    if (!branchData) {
      throw { status: 404, message: `Branch with ID - ${bind.branchId} not found` };
    }

    const userData = await user_get_db(conn, { id: bind.userId });

    if (!userData.length) {
      throw { status: 404, message: `User with ID - ${bind.userId} not found` };
    }

    const receiptId = await receipt_post_db(conn, { ...bind, vendorId: branchData.vendorId });

    if (bind.data && bind.dataType === 'FILE') {
      if (!bind.fileName) {
        throw { status: 400, message: `Bad request! "fileName" must be provided` };
      }
      const myBuffer = Buffer.from(bind.data, 'base64');
      await minioClient.putObject('0receipts', bind.fileName, myBuffer, { receiptId });
      delete bind.data;
      bind.fileUrl = `${process.env.API_URL}/api/v1/getFileObject/${bind.fileName}`;
    }

    const qr = await qrcode.toDataURL(`${process.env.API_URL}/api/v1/receipt-full-info/${receiptId}`);

    await receipt_data_post_db(conn, { receiptId, ...bind, qr });

    await conn.query('COMMIT');

    res.status(201).send(qr);
  } catch (error: any) {
    log.error(`Error in receipt_qr_post: ${JSON.stringify(error.message ? error.message : error)}`);

    if (conn) {
      try {
        await conn.query('ROLLBACK');
      } catch (error: any) {
        log.error(`Error rollback in receipt_qr_post: ${JSON.stringify(error.message ? error.message : error)}`);
      }
    }

    next(error);
  } finally {
    if (conn) {
      try {
        await conn.release();
      } catch (error: any) {
        log.error(`Error closing connection in receipt_qr_post: ${JSON.stringify(error.message ? error.message : error)}`);
      }
    }
  }
}

async function receipt_get(req: express.Request, res: express.Response, next: express.NextFunction) {
  let conn;
  try {
    conn = await pool.connect();

    const bind = { ...req.params, ...req.query };

    if (!bind.userId || !bind.limit || !bind.offset) {
      throw { status: 400, message: 'Bad request' };
    }

    const receiptData = await receipt_get_db(conn, bind);

    for (const item of receiptData) {
      const branchData = await branch_get_db(conn, { id: item.branchId });
      const [address] = await address_get_db(conn, { id: branchData.addressId });
      item.branchData = {
        name: branchData.name,
        address: {
          cityName: address.cityName,
          stateName: address.stateName,
          countryName: address.countryName,
          streetName: address.streetName,
          buildingNo: address.buildingNo,
          officeNo: address.buildingNo,
          zipCode: address.zipCode,
        },
      };

      const vendorData = await vendor_get_db(conn, { id: branchData.vendorId });
      if (vendorData) {
        const [address] = await address_get_db(conn, { id: vendorData.addressId });
        item.vendorData = {
          name: vendorData.name,
          address: {
            cityName: address.cityName,
            stateName: address.stateName,
            countryName: address.countryName,
            streetName: address.streetName,
            buildingNo: address.buildingNo,
            officeNo: address.buildingNo,
            zipCode: address.zipCode,
          },
        };
        const vendorIconData = await vendor_icon_get_db(conn, { vendorId: vendorData.id });
        item.vendorData.icons = vendorIconData?.map((item: any) => ({ id: item.id, typeCode: item.typeCode, url: item.url }));
      }
    }

    res.locals.data = {
      statusCode: 200,
      data: receiptData,
    };

    next();
  } catch (error: any) {
    log.error(`Error in receipt_get: ${JSON.stringify(error.message ? error.message : error)}`);
    next(error);
  } finally {
    if (conn) {
      try {
        await conn.release();
      } catch (error: any) {
        log.error(`Error closing connection in receipt_get: ${JSON.stringify(error.message ? error.message : error)}`);
      }
    }
  }
}

async function receipt_data_get(req: express.Request, res: express.Response, next: express.NextFunction) {
  let conn;
  try {
    conn = await pool.connect();

    const bind = { ...req.params, ...req.query };

    if (!bind.receiptId) {
      throw { status: 400, message: 'Bad request' };
    }

    const receiptData = await receipt_data_get_db(conn, bind);

    if (!receiptData) {
      throw { status: 404, message: 'Record not found' };
    }

    res.locals.data = {
      statusCode: 200,
      data: receiptData,
    };

    next();
  } catch (error: any) {
    log.error(`Error in receipt_data_get: ${JSON.stringify(error.message ? error.message : error)}`);
    next(error);
  } finally {
    if (conn) {
      try {
        await conn.release();
      } catch (error: any) {
        log.error(`Error closing connection in receipt_data_get: ${JSON.stringify(error.message ? error.message : error)}`);
      }
    }
  }
}

async function receipt_add_info_post(req: express.Request, res: express.Response, next: express.NextFunction) {
  let conn;
  try {
    conn = await pool.connect();

    const bind = { ...req.body, ...req.params };

    if (!bind.receiptId || !bind.key || !bind.value) {
      throw { status: 400, message: 'Bad request' };
    }

    const receiptData = await receipt_get_db(conn, { id: bind.receiptId });

    if (!receiptData) {
      throw { status: 404, message: `Receipt with ID - ${bind.receiptId} not found` };
    }

    const receiptAddInfoId = await receipt_add_info_post_db(conn, bind);

    res.locals.data = {
      statusCode: 201,
      data: {
        errCode: '0',
        data: {
          id: receiptAddInfoId,
        },
      },
    };

    next();
  } catch (error: any) {
    log.error(`Error in receipt_add_info_post: ${JSON.stringify(error.message ? error.message : error)}`);

    if (conn) {
      try {
        await conn.query('ROLLBACK');
      } catch (error: any) {
        log.error(`Error rollback in receipt_add_info_post: ${JSON.stringify(error.message ? error.message : error)}`);
      }
    }

    next(error);
  } finally {
    if (conn) {
      try {
        await conn.release();
      } catch (error: any) {
        log.error(`Error closing connection in receipt_add_info_post: ${JSON.stringify(error.message ? error.message : error)}`);
      }
    }
  }
}

async function receipt_add_info_get(req: express.Request, res: express.Response, next: express.NextFunction) {
  let conn;
  try {
    conn = await pool.connect();

    const bind = { ...req.params, ...req.query };

    if (!bind.receiptId) {
      throw { status: 400, message: 'Bad request' };
    }

    const receiptData = await receipt_get_db(conn, { id: bind.receiptId });

    if (!receiptData) {
      throw { status: 404, message: `Receipt with ID - ${bind.receiptId} not found` };
    }

    const receiptAddInfoData = await receipt_add_info_get_db(conn, { receiptId: bind.receiptId });

    res.locals.data = {
      statusCode: 200,
      data: receiptAddInfoData,
    };

    next();
  } catch (error: any) {
    log.error(`Error in receipt_add_info_get: ${JSON.stringify(error.message ? error.message : error)}`);
    next(error);
  } finally {
    if (conn) {
      try {
        await conn.release();
      } catch (error: any) {
        log.error(`Error closing connection in receipt_add_info_get: ${JSON.stringify(error.message ? error.message : error)}`);
      }
    }
  }
}

async function receipt_full_info_get(req: express.Request, res: express.Response, next: express.NextFunction) {
  let conn;
  try {
    conn = await pool.connect();

    const bind = { ...req.params, ...req.query };

    const receiptData = await receipt_get_db(conn, { id: bind.receiptId });

    if (!receiptData) {
      throw { status: 404, message: `Receipt with ID - ${bind.receiptId} not found` };
    }

    const branchData = await branch_get_db(conn, { id: receiptData.branchId });
    const [address] = await address_get_db(conn, { id: branchData.addressId });
    receiptData.branchData = {
      name: branchData.name,
      address: {
        cityName: address.cityName,
        stateName: address.stateName,
        countryName: address.countryName,
        streetName: address.streetName,
        buildingNo: address.buildingNo,
        officeNo: address.buildingNo,
        zipCode: address.zipCode,
      },
    };

    const vendorData = await vendor_get_db(conn, { id: branchData.vendorId });
    if (vendorData) {
      const [address] = await address_get_db(conn, { id: vendorData.addressId });
      receiptData.vendorData = {
        name: vendorData.name,
        address: {
          cityName: address.cityName,
          stateName: address.stateName,
          countryName: address.countryName,
          streetName: address.streetName,
          buildingNo: address.buildingNo,
          officeNo: address.buildingNo,
          zipCode: address.zipCode,
        },
      };
      const vendorIconData = await vendor_icon_get_db(conn, { vendorId: vendorData.id });
      receiptData.vendorData.icons = vendorIconData?.map((item: any) => ({ id: item.id, typeCode: item.typeCode, url: item.url }));
    }

    const receiptDataObj = await receipt_data_get_db(conn, { receiptId: bind.receiptId });
    if (receiptDataObj) {
      receiptData.receiptData = { data: receiptDataObj.data, fileUrl: receiptDataObj.fileUrl, typeCode: receiptDataObj.typeCode };
    }

    receiptData.addInfo = await receipt_add_info_get_db(conn, { receiptId: bind.receiptId });

    res.locals.data = {
      statusCode: 200,
      data: receiptData,
    };

    next();
  } catch (error: any) {
    log.error(`Error in receipt_full_info_get: ${JSON.stringify(error.message ? error.message : error)}`);
    next(error);
  } finally {
    if (conn) {
      try {
        await conn.release();
      } catch (error: any) {
        log.error(`Error closing connection in receipt_full_info_get: ${JSON.stringify(error.message ? error.message : error)}`);
      }
    }
  }
}

export { receipt_post, receipt_get, receipt_data_get, receipt_add_info_post, receipt_add_info_get, receipt_full_info_get, receipt_qr_post };
