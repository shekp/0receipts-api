async function vendor_post_db(conn: any, bind: any) {
  try {
    const arrBind = [bind.name, bind.addressId, bind.userData?.authUsername?.toUpperCase()];

    const query = `
      insert into invoice_system.vendor(name, address_id, create_date, create_user, update_date, update_user)
      values ($1, $2, current_timestamp, $3, current_timestamp, $3)
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

async function vendor_icon_post_db(conn: any, bind: any) {
  try {
    const arrBind = [bind.vendorId, bind.typeCode, bind.url];

    const query = `
        insert into invoice_system.vendor_icon(vendor_id, type_code, url)
        values ($1, $2, $3)
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

async function vendor_get_db(conn: any, bind: any): Promise<any> {
  try {
    let sql_where_clause: any = '';
    const arrBind = [];

    if (bind.id) {
      sql_where_clause += ` ${sql_where_clause.trim() ? ' and ' : 'where'} v.id = $${arrBind.push(bind.id)} `;
    }

    const select: string = `
      select v.id,
              v.name,
              v.address_id "addressId",
              v.create_date "createDate",
              v.update_date "updateDate",
              v.create_user "createUser",
              v.update_user "updateUser"
      from invoice_system.vendor v
      ${sql_where_clause}
    `;

    const { rows } = await conn.query(select, arrBind);
    return bind.id ? rows[0] : rows;
  } catch (err: any) {
    throw err.message ? err.message : err;
  }
}

async function vendor_icon_get_db(conn: any, bind: any): Promise<any> {
  try {
    let sql_where_clause: any = '';
    const arrBind = [];

    if (bind.id) {
      sql_where_clause += ` ${sql_where_clause.trim() ? ' and ' : 'where'} vi.id = $${arrBind.push(bind.id)} `;
    }

    if (bind.vendorId) {
      sql_where_clause += ` ${sql_where_clause.trim() ? ' and ' : 'where'} vi.vendor_id = $${arrBind.push(bind.vendorId)} `;
    }

    const select: string = `
      select vi.id,
              vi.type_code "typeCode",
              vi.url,
              vi.create_date "createDate",
              vi.update_date "updateDate",
              vi.create_user "createUser",
              vi.update_user "updateUser"
      from invoice_system.vendor_icon vi
      ${sql_where_clause}
    `;

    const { rows } = await conn.query(select, arrBind);
    return bind.id ? rows[0] : rows;
  } catch (err: any) {
    throw err.message ? err.message : err;
  }
}

export { vendor_post_db, vendor_icon_post_db, vendor_get_db, vendor_icon_get_db };
