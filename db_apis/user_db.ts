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

    return id;
  } catch (err) {
    throw err;
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

    const { rows } = await conn.query(select, arrBind);

    return rows;
  } catch (err) {
    throw err;
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
      updStr += ` ${updStr.trim() ? ' , ' : ' '} update_user = $${arrBind.push(bind.userData?.authUsername?.toUpperCase())}`;
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

    if (bind.middleName) {
      updStr += ` ${updStr.trim() ? ' , ' : ' '} middle_name = $${arrBind.push(bind.middleName)}`;
    }

    updStr += ` ${updStr.trim() ? ' , ' : ' '} update_date = current_timestamp`;

    const query = `update invoice_system.user set ${updStr} where id = $${arrBind.push(bind.id)} returning id`;

    const { rows } = await conn.query(query, arrBind);
    return rows[0]?.id;
  } catch (err: any) {
    throw err.message ? err.message : err;
  }
}

async function user_token_upsert_db(conn: any, bind: Array<[]>, type: String) {
  try {
    const arrBind = [...bind];

    const query = `
      INSERT INTO invoice_system.user_token (user_id, token_code, token, expire_date)
      VALUES($1, $2, $3, current_timestamp + (${type === 'access' ? '15' : '30'} * interval '1 minute')) 
      ON CONFLICT (user_id, token_code) 
      DO 
        UPDATE SET token = $3, expire_date = (current_timestamp + (${type === 'access' ? '15' : '30'} * interval '1 minute')), update_date = current_timestamp
    `;

    await conn.query(query, arrBind);
  } catch (error: any) {
    throw error.message ? error.message : error;
  }
}

async function user_access_get_db(conn: any, bind: any) {
  try {
    let sql_where_clause: string = '';
    const arrBind = [];

    if (bind.userId) {
      sql_where_clause += ` ${sql_where_clause.trim() ? ' and ' : 'where'} user_id = $${arrBind.push(bind.userId)} `;
    }

    if (bind.token) {
      sql_where_clause += ` ${sql_where_clause.trim() ? ' and ' : 'where'} token = $${arrBind.push(bind.token)} `;
    }

    if (bind.tokenCode) {
      sql_where_clause += ` ${sql_where_clause.trim() ? ' and ' : 'where'} token_code = $${arrBind.push(bind.tokenCode)} `;
    }

    const query = `select * from invoice_system.user_token ${sql_where_clause} order by create_date desc`;
    const { rows } = await conn.query(query, arrBind);
    return rows;
  } catch (err) {
    throw err;
  }
}

async function user_access_delete_db(conn: any, bind: any) {
  try {
    const query = `delete from invoice_system.user_token where user_id = $1 and token = $2 returning id`;
    const { rows } = await conn.query(query, [bind.userId, bind.token]);
    return rows[0]?.id;
  } catch (err: any) {
    throw err.message ? err.message : err;
  }
}

export { user_post_db, user_patch_db, user_get_db, user_token_upsert_db, user_access_get_db, user_access_delete_db };
