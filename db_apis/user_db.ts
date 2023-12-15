async function user_post_db(conn: any, bind: any): Promise<any> {
  try {
    const arrBind: any = [bind.username, bind.password, bind.firstName, bind.lastName, bind.middleName, bind.gender, bind.email, bind.titleId];

    const query = `
      insert into invoice_system.user(username, password, first_name, last_name, middle_name, gender, email, user_title_id)
      values ($1, $2, $3, $4, $5, $6, $7, $8)
      returning id
    `;

    const {
      rows: {
        [0]: { id },
      },
    } = await conn.query(query, arrBind);
    console.log('id', id);
    return id;
  } catch (err: any) {
    throw err.message ? err.message : err;
  }
}

async function user_get_db(conn: any, bind: any): Promise<any> {
  try {
    let sql_where_clause: any = '';
    const arrBind = [];

    if (bind.id) {
      sql_where_clause += ` ${sql_where_clause.trim() ? ' and ' : 'where'} u.id = $${arrBind.push(bind.id)} `;
    }

    if (bind.username) {
      sql_where_clause += ` ${sql_where_clause.trim() ? ' and ' : 'where'} u.username ilike $${arrBind.push(bind.username)} `;
    }

    const select: string = `
      select u.id,
              u.username,
              ${bind.isCheckPassword ? 'u.password,' : ''}
              u.first_name "firstName",
              u.last_name "lastName",
              u.middle_name "middleName",
              u.gender,
              u.email,
              u.user_title_id "titleId",
              ut.name "titleName",
              u.create_date "createDate",
              u.update_date "updateDate",
              u.create_user "createUser",
              u.update_user "updateUser"
      from invoice_system.user u
      join invoice_system.user_title ut on ut.id = u.user_title_id
      ${sql_where_clause}
    `;
    console.log('select', select);
    const { rows } = await conn.query(select, arrBind);
    console.log('rows', rows);
    return rows;
  } catch (err: any) {
    throw err.message ? err.message : err;
  }
}

async function user_patch_db(conn: any, bind: any): Promise<number> {
  try {
    const arrBind: Array<[]> = [];
    let updStr = '';

    if (bind.password) {
      updStr += ` ${updStr.trim() ? ' , ' : ' '} password = $${arrBind.push(bind.password)}`;
    }

    if (bind.userData) {
      updStr += ` ${updStr.trim() ? ' , ' : ' '} update_user = $${arrBind.push(bind.userData?.username?.toUpperCase())}`;
    }

    if (bind.firstName) {
      updStr += ` ${updStr.trim() ? ' , ' : ' '} first_name = $${arrBind.push(bind.firstName)}`;
    }

    if (bind.email) {
      updStr += ` ${updStr.trim() ? ' , ' : ' '} email = $${arrBind.push(bind.email)}`;
    }

    if (bind.lastName) {
      updStr += ` ${updStr.trim() ? ' , ' : ' '} last_name = $${arrBind.push(bind.lastName)}`;
    }

    updStr += ` ${updStr.trim() ? ' , ' : ' '} update_date = current_timestamp`;

    const query = `update invoice_system.user set ${updStr} where id = $${arrBind.push(bind.id)} returning id`;

    const { rows } = await conn.query(query, arrBind);
    return rows[0]?.id;
  } catch (err: any) {
    throw err.message ? err.message : err;
  }
}

async function user_token_upsert_db(conn: any, bind: Array<[]>) {
  try {
    const arrBind = [...bind];

    const query = `
      INSERT INTO invoice_system.user_token (user_id, token_code, token, expire_date)
      VALUES($1, $2, $3, current_timestamp + (15 * interval '1 minute')) 
      ON CONFLICT (user_id, token_code) 
      DO 
        UPDATE SET token = $3, expire_date = (current_timestamp + (15 * interval '1 minute')), update_date = current_timestamp
    `;

    await conn.query(query, arrBind);
  } catch (error: any) {
    throw error.message ? error.message : error;
  }
}

async function partner_user_access_get_db(conn: any, bind: any) {
  try {
    let sql_where_clause: string = '';
    const arrBind = [];

    if (bind.userId) {
      sql_where_clause += ` ${sql_where_clause.trim() ? ' and ' : 'where'} user_id = $${arrBind.push(bind.userId)} `;
    }

    if (bind.token) {
      sql_where_clause += ` ${sql_where_clause.trim() ? ' and ' : 'where'} token = $${arrBind.push(bind.token)} `;
    }

    const query = `select 1 as access from crm.user_access_token ${sql_where_clause} order by create_date desc`;

    const { rows } = await conn.query(query, arrBind);
    return rows;
  } catch (err: any) {
    throw err.message ? err.message : err;
  }
}

async function partner_user_refresh_post_db(conn: any, bind: Array<[]>) {
  try {
    const arrBind = [...bind];
    const query = `
      insert into crm.user_refresh_token (user_id, ip, os, browser, user_agent, token, expire_date, create_user, update_user)
      values ($1, $2, $3, $4, $5, $6, current_timestamp + (30 * interval '1 minute'), 'prm', 'prm')
    `;
    await conn.query(query, arrBind);
  } catch (err: any) {
    throw err.message ? err.message : err;
  }
}

async function partner_user_refresh_get_db(conn: any, bind: any) {
  try {
    let sql_where_clause: string = '';
    const arrBind = [];

    if (bind.userId) {
      sql_where_clause += ` ${sql_where_clause.trim() ? ' and ' : 'where'} user_id = $${arrBind.push(bind.userId)} `;
    }

    if (bind.token) {
      sql_where_clause += ` ${sql_where_clause.trim() ? ' and ' : 'where'} token = $${arrBind.push(bind.token)} `;
    }

    const query = `select * from crm.user_refresh_token ${sql_where_clause} order by create_date desc`;

    const { rows } = await conn.query(query, arrBind);
    return rows;
  } catch (err: any) {
    throw err.message ? err.message : err;
  }
}

async function partner_user_refresh_patch_db(conn: any, bind: Array<[]>) {
  try {
    const arrBind = [...bind];

    const query = `
      update crm.user_refresh_token set
        ip = $1, os = $2, browser = $3, user_agent = $4, token = $5, expire_date = (current_timestamp + (30 * interval '1 minute')), update_date = current_timestamp
      where id = $6
    `;

    await conn.query(query, arrBind);
  } catch (err: any) {
    throw err.message ? err.message : err;
  }
}

export {
  user_post_db,
  user_patch_db,
  user_get_db,
  user_token_upsert_db,
  partner_user_access_get_db,
  partner_user_refresh_post_db,
  partner_user_refresh_patch_db,
  partner_user_refresh_get_db,
};
