import express from 'express';

import log from '../config/logger';
import pool from '../loaders/database';
import { vendor_post_db, vendor_icon_post_db, vendor_get_db, vendor_icon_get_db } from '../db_apis/vendor_db';
import { branch_post_db, branch_get_db } from '../db_apis/branch_db';
import { contact_post_db, contact_get_db } from '../db_apis/contact_db';
import { address_get_db } from '../db_apis/address.db';

async function vendor_get(req: any, res: express.Response, next: express.NextFunction) {
  let conn;
  try {
    conn = await pool.connect();

    const bind = { ...req.params, ...req.query };

    if (!bind.vendorId) {
      throw { status: 400, message: 'Vendor ID not transmitted' };
    }

    const vendorData = await vendor_get_db(conn, { id: bind.vendorId });

    if (!vendorData) {
      throw { status: 404, message: `Vendor with ID - ${bind.vendorId} not found` };
    }

    if (vendorData) {
      const [addressData] = await address_get_db(conn, { id: vendorData.addressId });

      vendorData.address = {
        cityName: addressData.cityName,
        stateName: addressData.stateName,
        countryName: addressData.countryName,
        streetName: addressData.streetName,
        buildingNo: addressData.buildingNo,
        officeNo: addressData.buildingNo,
        zipCode: addressData.zipCode,
      };
      const branchData = await branch_get_db(conn, { vendorId: vendorData.id });
      vendorData.branches = branchData?.map((item: any) => ({ id: item.id, name: item.name }));

      vendorData.contacts = await contact_get_db(conn, { vendorId: vendorData.id });

      const vendorIconData = await vendor_icon_get_db(conn, { vendorId: vendorData.id });
      vendorData.icons = vendorIconData?.map((item: any) => ({ id: item.id, typeCode: item.typeCode, url: item.url }));
    }

    res.locals.data = {
      statusCode: 200,
      data: vendorData,
    };

    next();
  } catch (error: any) {
    log.error(`Error in vendor_get: ${JSON.stringify(error.message ? error.message : error)}`);
    next(error);
  } finally {
    if (conn) {
      try {
        await conn.release();
      } catch (error: any) {
        log.error(`Error closing connection in vendor_get: ${JSON.stringify(error.message ? error.message : error)}`);
      }
    }
  }
}

async function vendor_post(req: any, res: express.Response, next: express.NextFunction) {
  let conn;
  try {
    conn = await pool.connect();

    await conn.query('BEGIN');

    const bind = { ...req.body };

    if (!bind.name || !bind.addressId) {
      throw { status: 400, message: 'Bad request' };
    }

    const vendorId = await vendor_post_db(conn, bind);

    if (bind.branches?.length) {
      for (const branch of bind.branches) {
        await branch_post_db(conn, { vendorId, ...branch, userData: bind.userData });
      }
    }

    if (bind.contacts?.length) {
      for (const contact of bind.contacts) {
        await contact_post_db(conn, { vendorId, ...contact, userData: bind.userData });
      }
    }

    if (bind.icons?.length) {
      for (const icon of bind.icons) {
        await vendor_icon_post_db(conn, { vendorId, ...icon, userData: bind.userData });
      }
    }

    await conn.query('COMMIT');

    res.locals.data = {
      statusCode: 201,
      data: {
        errCode: '0',
        data: { id: vendorId },
      },
    };

    next();
  } catch (error: any) {
    log.error(`Error in vendor_post: ${JSON.stringify(error.message ? error.message : error)}`);

    if (conn) {
      try {
        await conn.query('ROLLBACK');
      } catch (error: any) {
        log.error(`Error rollback in vendor_post: ${JSON.stringify(error.message ? error.message : error)}`);
      }
    }

    next(error);
  } finally {
    if (conn) {
      try {
        await conn.release();
      } catch (error: any) {
        log.error(`Error closing connection in vendor_post: ${JSON.stringify(error.message ? error.message : error)}`);
      }
    }
  }
}

async function vendor_branch_get(req: any, res: express.Response, next: express.NextFunction) {
  let conn;
  try {
    conn = await pool.connect();

    const bind = { ...req.params, ...req.query };

    if (!bind.vendorId) {
      throw { status: 400, message: 'vendor ID not transmitted' };
    }

    const branchData = await branch_get_db(conn, { vendorId: bind.vendorId });

    for (const item of branchData) {
      const [addressData] = await address_get_db(conn, { id: item.addressId });

      item.address = {
        cityName: addressData.cityName,
        stateName: addressData.stateName,
        countryName: addressData.countryName,
        streetName: addressData.streetName,
        buildingNo: addressData.buildingNo,
        officeNo: addressData.buildingNo,
        zipCode: addressData.zipCode,
      };
    }

    res.locals.data = {
      statusCode: 200,
      data: branchData,
    };

    next();
  } catch (error: any) {
    log.error(`Error in vendor_branch_get: ${JSON.stringify(error.message ? error.message : error)}`);
    next(error);
  } finally {
    if (conn) {
      try {
        await conn.release();
      } catch (error: any) {
        log.error(`Error closing connection in vendor_branch_get: ${JSON.stringify(error.message ? error.message : error)}`);
      }
    }
  }
}

async function vendor_branch_post(req: any, res: express.Response, next: express.NextFunction) {
  let conn;
  try {
    conn = await pool.connect();

    const bind = { ...req.params, ...req.body };

    if (!bind.vendorId) {
      throw { status: 400, message: 'Vendor ID not transmitted' };
    }

    if (!bind.name || !bind.addressId) {
      throw { status: 400, message: 'Bad request' };
    }

    const vendorData = await vendor_get_db(conn, { id: bind.vendorId });

    if (!vendorData) {
      throw { status: 404, message: `Vendor with ID - ${bind.vendorId} not found` };
    }

    const branchId = await branch_post_db(conn, { vendorId: bind.vendorId, ...bind });

    const branchData = await branch_get_db(conn, { id: branchId });

    const [addressData] = await address_get_db(conn, { id: branchData.addressId });

    branchData.address = {
      cityName: addressData.cityName,
      stateName: addressData.stateName,
      countryName: addressData.countryName,
      streetName: addressData.streetName,
      buildingNo: addressData.buildingNo,
      officeNo: addressData.buildingNo,
      zipCode: addressData.zipCode,
    };

    res.locals.data = {
      statusCode: 201,
      data: branchData,
    };

    next();
  } catch (error: any) {
    log.error(`Error in vendor_branch_post: ${JSON.stringify(error.message ? error.message : error)}`);
    next(error);
  } finally {
    if (conn) {
      try {
        await conn.release();
      } catch (error: any) {
        log.error(`Error closing connection in vendor_branch_post: ${JSON.stringify(error.message ? error.message : error)}`);
      }
    }
  }
}

async function vendor_contact_get(req: any, res: express.Response, next: express.NextFunction) {
  let conn;
  try {
    conn = await pool.connect();

    const bind = { ...req.params, ...req.query };

    if (!bind.vendorId) {
      throw { status: 400, message: 'vendor ID not transmitted' };
    }

    const contactData = await contact_get_db(conn, { vendorId: bind.vendorId });

    res.locals.data = {
      statusCode: 200,
      data: contactData,
    };

    next();
  } catch (error: any) {
    log.error(`Error in vendor_contact_get: ${JSON.stringify(error.message ? error.message : error)}`);
    next(error);
  } finally {
    if (conn) {
      try {
        await conn.release();
      } catch (error: any) {
        log.error(`Error closing connection in vendor_contact_get: ${JSON.stringify(error.message ? error.message : error)}`);
      }
    }
  }
}

async function vendor_contact_post(req: any, res: express.Response, next: express.NextFunction) {
  let conn;
  try {
    conn = await pool.connect();

    const bind = { ...req.params, ...req.body };

    if (!bind.vendorId) {
      throw { status: 400, message: 'vendor ID not transmitted' };
    }

    if (!bind.name || !bind.email || !bind.phone) {
      throw { status: 400, message: 'Bad request' };
    }

    const vendorData = await vendor_get_db(conn, { id: bind.vendorId });

    if (!vendorData) {
      throw { status: 404, message: `Vendor with ID - ${bind.vendorId} not found` };
    }

    const contactId = await contact_post_db(conn, { vendorId: bind.vendorId, ...bind });

    const contactData = await contact_get_db(conn, { id: contactId });

    res.locals.data = {
      statusCode: 201,
      data: contactData,
    };

    next();
  } catch (error: any) {
    log.error(`Error in vendor_contact_post: ${JSON.stringify(error.message ? error.message : error)}`);
    next(error);
  } finally {
    if (conn) {
      try {
        await conn.release();
      } catch (error: any) {
        log.error(`Error closing connection in vendor_contact_post: ${JSON.stringify(error.message ? error.message : error)}`);
      }
    }
  }
}

export { vendor_get, vendor_post, vendor_branch_get, vendor_branch_post, vendor_contact_get, vendor_contact_post };
