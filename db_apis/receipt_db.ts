async function receipt_post_db(conn: any, bind: any) {
  try {
    const arrBind = [bind.userId, bind.vendorId, bind.typeId, bind.branchId, bind.receiptNo, bind.userData?.authUsername?.toUpperCase()];

    const query = `
        insert into invoice_system.receipt(user_id, vendor_id, receipt_type_id, branch_id, receipt_no, create_date, create_user, update_date, update_user)
        values ($1, $2, $3, $4, $5, current_timestamp, $6, current_timestamp, $6)
        returning id
    `;

    const {
      rows: {
        [0]: { id },
      },
    } = await conn.query(query, arrBind);

    return id;
  } catch (error) {
    throw error;
  }
}

async function receipt_data_post_db(conn: any, bind: any) {
  try {
    const arrBind = [bind.receiptId, bind.data, bind.fileUrl, bind.qr, bind.dataType];

    const query = `
          insert into invoice_system.receipt_data(receipt_id, data, file_url, qr, type_code)
          values ($1, $2, $3, $4, $5)
          returning receipt_id
      `;

    const {
      rows: {
        [0]: { id },
      },
    } = await conn.query(query, arrBind);

    return id;
  } catch (error) {
    throw error;
  }
}

async function receipt_get_db(conn: any, bind: any): Promise<any> {
  try {
    let sql_where_clause: any = '';
    const arrBind = [];

    if (bind.id) {
      sql_where_clause += ` ${sql_where_clause.trim() ? ' and ' : 'where'} r.id = $${arrBind.push(bind.id)} `;
    }

    if (bind.userId) {
      sql_where_clause += ` ${sql_where_clause.trim() ? ' and ' : 'where'} r.user_id = $${arrBind.push(bind.userId)} `;
    }

    const select: string = `
      select r.id,
              r.user_id "userId",
              r.branch_id "branchId",
              r.receipt_type_id "typeId",
              r.receipt_no "receiptNo",
              r.create_date "createDate",
              r.update_date "updateDate",
              r.create_user "createUser",
              r.update_user "updateUser"
      from invoice_system.receipt r
      ${sql_where_clause}
      order by r.id desc
      ${bind.limit && bind.offset ? `limit ${bind.limit} offset ${bind.offset}` : ''}
    `;

    const { rows } = await conn.query(select, arrBind);

    return bind.id ? rows[0] : rows;
  } catch (err) {
    throw err;
  }
}

async function receipt_data_get_db(conn: any, bind: any): Promise<any> {
  try {
    let sql_where_clause: any = '';
    const arrBind = [];

    if (bind.receiptId) {
      sql_where_clause += ` ${sql_where_clause.trim() ? ' and ' : 'where'} rd.receipt_id = $${arrBind.push(bind.receiptId)} `;
    }

    const select: string = `
      select rd.data,
            rd.file_url "fileUrl",
            rd.type_code "typeCode"
      from invoice_system.receipt_data rd
      ${sql_where_clause}
    `;

    const { rows } = await conn.query(select, arrBind);

    return bind.receiptId ? rows[0] : rows;
  } catch (err) {
    throw err;
  }
}

async function receipt_add_info_post_db(conn: any, bind: any) {
  try {
    const arrBind = [bind.receiptId, bind.key, bind.value, bind.userData?.authUsername?.toUpperCase()];

    const query = `
      insert into invoice_system.receipt_add_info(receipt_id, key, value, create_date, create_user, update_date, update_user)
      values ($1, $2, $3, current_timestamp, $4, current_timestamp, $4)
      returning id
    `;

    const {
      rows: {
        [0]: { id },
      },
    } = await conn.query(query, arrBind);

    return id;
  } catch (error) {
    throw error;
  }
}

async function receipt_add_info_get_db(conn: any, bind: any): Promise<any> {
  try {
    let sql_where_clause: any = '';
    const arrBind = [];

    if (bind.receiptId) {
      sql_where_clause += ` ${sql_where_clause.trim() ? ' and ' : 'where'} receipt_id = $${arrBind.push(bind.receiptId)} `;
    }

    const select: string = `
      select key,
            value,
            create_date "createDate",
            update_date "updateDate",
            create_user "createUser",
            update_user "updateUser"
      from invoice_system.receipt_add_info
      ${sql_where_clause}
    `;

    const { rows } = await conn.query(select, arrBind);

    return bind.id ? rows[0] : rows;
  } catch (err) {
    throw err;
  }
}

export { receipt_post_db, receipt_data_post_db, receipt_get_db, receipt_data_get_db, receipt_add_info_post_db, receipt_add_info_get_db };
