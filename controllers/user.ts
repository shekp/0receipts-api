import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import log from '../config/logger';
import pool from '../loaders/database';
import { user_post_db, user_get_db, user_patch_db } from '../db_apis/user_db';

async function user_get(req: any, res: express.Response, next: express.NextFunction) {
  let conn;
  try {
    conn = await pool.connect();

    const bind = { ...req.params, ...req.query };
    console.log('user get', bind);
    if (!bind.id) {
      throw { status: 400, message: 'user ID not transmitted' };
    }

    const userData = await user_get_db(conn, bind);

    res.locals.data = {
      statusCode: 200,
      data: userData,
    };

    next();
  } catch (error: any) {
    log.error(`Error in user_get: ${JSON.stringify(error.message ? error.message : error)}`);
    next(error);
  } finally {
    if (conn) {
      try {
        await conn.release();
      } catch (error: any) {
        log.error(`Error closing connection in user_get: ${JSON.stringify(error.message ? error.message : error)}`);
      }
    }
  }
}

async function user_post(req: any, res: express.Response, next: express.NextFunction) {
  let conn;
  try {
    conn = await pool.connect();

    const bind = { ...req.body };

    const currentUserData = await user_get_db(conn, bind);

    if (currentUserData.length) {
      throw 'A user with this username already exists';
    }

    const salt = bcrypt.genSaltSync(11);
    bind.password = await bcrypt.hash(bind.password, salt);

    const userId = await user_post_db(conn, bind);

    const userData = await user_get_db(conn, { id: userId });

    res.locals.data = {
      statusCode: 201,
      data: userData,
    };

    next();
  } catch (error: any) {
    log.error(`Error in user_post: ${JSON.stringify(error.message ? error.message : error)}`);

    if (conn) {
      try {
        await conn.query('ROLLBACK');
      } catch (error: any) {
        log.error(`Error rollback in user_post: ${JSON.stringify(error.message ? error.message : error)}`);
      }
    }

    next(error);
  } finally {
    if (conn) {
      try {
        await conn.release();
      } catch (error: any) {
        log.error(`Error closing connection in user_post: ${JSON.stringify(error.message ? error.message : error)}`);
      }
    }
  }
}

async function user_patch(req: any, res: express.Response, next: express.NextFunction) {
  let conn;
  try {
    conn = await pool.connect();

    const bind = { ...req.body, ...req.params, userData: req.userData };

    if (!bind.id) {
      throw { status: 400, message: 'user ID not transmitted' };
    }

    const currentUserData = await user_get_db(conn, { id: bind.id });

    if (!currentUserData.length) {
      throw { status: 404, message: 'User not found in the system' };
    }

    const userId = await user_patch_db(conn, { ...bind, id: currentUserData[0].id });

    res.locals.data = {
      statusCode: 200,
      data: {
        errCode: 0,
        data: { id: userId },
      },
    };

    next();
  } catch (error: any) {
    log.error(`Error in user_patch: ${JSON.stringify(error.message ? error.message : error)}`);

    if (conn) {
      try {
        await conn.query('ROLLBACK');
      } catch (error: any) {
        log.error(`Error rollback in user_patch: ${JSON.stringify(error.message ? error.message : error)}`);
      }
    }

    next(error);
  } finally {
    if (conn) {
      try {
        await conn.release();
      } catch (error: any) {
        log.error(`Error closing connection in user_patch: ${JSON.stringify(error.message ? error.message : error)}`);
      }
    }
  }
}

async function user_login(req: any, res: express.Response, next: express.NextFunction) {
  let conn;
  try {
    conn = await pool.connect();

    const bind = { ...req.body };

    if (!bind.username || !bind.password) {
      throw { status: 400, message: 'Bad request' };
    }

    const userData = await user_get_db(conn, { ...bind, isCheckPassword: true });
    console.log('userData', userData);
    if (!userData.length) {
      throw { status: 404, message: 'User not found in the system' };
    }

    const comparePassword = await bcrypt.compare(bind.password, userData[0].password);

    if (!comparePassword) {
      throw { status: 403, message: 'Wrong password' };
    }

    const accessToken = await jwt.sign(
      {
        userId: userData[0].id,
        username: userData[0].username,
      },
      'access',
      { expiresIn: '60m' }
    );

    const refreshToken = await jwt.sign(
      {
        userId: userData[0].id,
        username: userData[0].username,
      },
      'refresh',
      { expiresIn: '30m' }
    );

    res.locals.data = {
      statusCode: 200,
      data: {
        accessToken,
        refreshToken,
      },
    };

    next();
  } catch (error: any) {
    log.error(`Error in user_login: ${JSON.stringify(error.message ? error.message : error)}`);
    next(error);
  } finally {
    if (conn) {
      try {
        await conn.release();
      } catch (error: any) {
        log.error(`Error closing connection in user_login: ${JSON.stringify(error.message ? error.message : error)}`);
      }
    }
  }
}

async function user_password(req: any, res: express.Response, next: express.NextFunction) {
  let conn;
  try {
    conn = await pool.connect();
    console.log('req.userData', req.userData);
    const bind = { ...req.body, userData: req.userData };
    console.log('bind', bind);
    if (!bind.username || !bind.newPassword || !bind.oldPassword) {
      throw { status: 400, message: 'Bad request' };
    }

    const userData = await user_get_db(conn, { ...bind, isCheckPassword: true });
    console.log('userData', userData);
    if (!userData.length) {
      throw { status: 404, message: 'User not found in the system' };
    }

    const comparePassword = await bcrypt.compare(bind.oldPassword, userData[0].password);

    if (!comparePassword) {
      throw { status: 403, message: 'Wrong password' };
    }

    const salt = bcrypt.genSaltSync(11);
    bind.password = await bcrypt.hash(bind.newPassword, salt);

    const userId = await user_patch_db(conn, { ...bind, id: userData[0].id });

    res.locals.data = {
      statusCode: 200,
      data: {
        errCode: 0,
        data: { id: userId },
      },
    };

    next();
  } catch (error: any) {
    log.error(`Error in user_post: ${JSON.stringify(error.message ? error.message : error)}`);

    if (conn) {
      try {
        await conn.query('ROLLBACK');
      } catch (error: any) {
        log.error(`Error rollback in user_post: ${JSON.stringify(error.message ? error.message : error)}`);
      }
    }

    next(error);
  } finally {
    if (conn) {
      try {
        await conn.release();
      } catch (error: any) {
        log.error(`Error closing connection in user_post: ${JSON.stringify(error.message ? error.message : error)}`);
      }
    }
  }
}

export { user_post, user_get, user_patch, user_login, user_password };
