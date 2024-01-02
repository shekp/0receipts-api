import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import log from '../config/logger';
import pool from '../loaders/database';
import { user_post_db, user_get_db, user_patch_db, user_token_upsert_db, user_access_get_db, user_access_delete_db } from '../db_apis/user_db';

async function user_get(req: any, res: express.Response, next: express.NextFunction) {
  let conn;
  try {
    conn = await pool.connect();

    const bind = { ...req.params, ...req.query };

    if (!bind.userId) {
      throw { status: 400, message: 'User ID not transmitted' };
    }

    const [userData] = await user_get_db(conn, { id: bind.userId });

    if (!userData) {
      throw { status: 404, message: `User with ID - ${bind.userId} not found` };
    }

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

    if (!bind.username || !bind.password || !bind.firstName || !bind.lastName) {
      throw { status: 400, message: 'Bad request' };
    }

    const currentUserData = await user_get_db(conn, bind);

    if (currentUserData.length) {
      throw 'A user with this username already exists';
    }

    const salt = bcrypt.genSaltSync(11);
    bind.password = await bcrypt.hash(bind.password, salt);

    const userId = await user_post_db(conn, bind);

    const [userData] = await user_get_db(conn, { id: userId });

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

    const bind = { ...req.body, ...req.params };

    if (!bind.userId) {
      throw { status: 400, message: 'User ID not transmitted' };
    }

    const currentUserData = await user_get_db(conn, { id: bind.userId });

    if (!currentUserData.length) {
      throw { status: 404, message: `User with ID - ${bind.userId} not found` };
    }

    if (!bind.firstName && !bind.lastName && !bind.middleName && !bind.email) {
      throw { status: 400, message: `Bad request` };
    }

    if (bind.password || bind.gender || bind.userTitleId) {
      throw { status: 400, message: `Bad request` };
    }

    const userId = await user_patch_db(conn, { ...bind, id: currentUserData[0].id });

    res.locals.data = {
      statusCode: 200,
      data: {
        errCode: '0',
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

    if (!userData.length) {
      throw { status: 404, message: 'User not found in the system' };
    }

    const comparePassword = await bcrypt.compare(bind.password, userData[0].password);

    if (!comparePassword) {
      throw { status: 403, message: 'Wrong password' };
    }

    const accessToken = await jwt.sign(
      {
        authUserId: userData[0].id,
        authUsername: userData[0].username,
      },
      `${process.env.AUTH_ACCESS_KEY}`,
      { expiresIn: '60m' }
    );

    await user_token_upsert_db(conn, [userData[0].id, 'access', accessToken], 'access');

    const refreshToken = await jwt.sign(
      {
        authUserId: userData[0].id,
        authUsername: userData[0].username,
      },
      `${process.env.AUTH_REFRESH_KEY}`,
      { expiresIn: '30m' }
    );

    await user_token_upsert_db(conn, [userData[0].id, 'refresh', refreshToken], 'refresh');

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

async function user_logout(req: any, res: express.Response, next: express.NextFunction) {
  let conn;
  try {
    conn = await pool.connect();

    const bind = { ...req.body?.userData };

    const [accessData] = await user_access_get_db(conn, { userId: bind.authUserId, tokenCode: 'access' });
    const userAccessId = await user_access_delete_db(conn, { userId: bind.authUserId, token: accessData.token });

    res.locals.data = {
      statusCode: 200,
      data: {
        errCode: '0',
        data: { id: userAccessId },
      },
    };

    next();
  } catch (error: any) {
    log.error(`Error in user_logout: ${JSON.stringify(error.message ? error.message : error)}`);

    if (conn) {
      try {
        await conn.query('ROLLBACK');
      } catch (error: any) {
        log.error(`Error rollback in user_logout: ${JSON.stringify(error.message ? error.message : error)}`);
      }
    }

    next(error);
  } finally {
    if (conn) {
      try {
        await conn.release();
      } catch (error: any) {
        log.error(`Error closing connection in user_logout: ${JSON.stringify(error.message ? error.message : error)}`);
      }
    }
  }
}

async function user_password(req: any, res: express.Response, next: express.NextFunction) {
  let conn;
  try {
    conn = await pool.connect();

    const bind = { ...req.body, userData: req.userData };

    if (!bind.username || !bind.newPassword || !bind.oldPassword) {
      throw { status: 400, message: 'Bad request' };
    }

    const userData = await user_get_db(conn, { ...bind, isCheckPassword: true });

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
        errCode: '0',
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

async function user_access_get(userId: Number, token: String) {
  let conn;
  try {
    conn = await pool.connect();

    if (!userId) {
      throw { status: 400, message: 'Bad request' };
    }

    const { [0]: result } = await user_access_get_db(conn, { userId, token });

    return result;
  } catch (error: any) {
    log.error(`Error in user_access_get: ${JSON.stringify(error.message ? error.message : error)}`);
    throw error;
  } finally {
    if (conn) {
      try {
        await conn.release();
      } catch (error: any) {
        log.error(`Error closing connection in user_access_get: ${JSON.stringify(error.message ? error.message : error)}`);
      }
    }
  }
}

export { user_post, user_get, user_patch, user_login, user_logout, user_password, user_access_get };
