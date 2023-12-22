async function branch_post_db(conn: any, bind: any) {
  try {
    const arrBind = [bind.vendorId, bind.addressId, bind.name, bind.userData?.authUsername?.toUpperCase()];

    const query = `
          insert into invoice_system.branch(vendor_id, address_id, name, create_date, create_user, update_date, update_user)
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

async function branch_get_db(conn: any, bind: any): Promise<any> {
  try {
    let sql_where_clause: any = '';
    const arrBind = [];

    if (bind.id) {
      sql_where_clause += ` ${sql_where_clause.trim() ? ' and ' : 'where'} b.id = $${arrBind.push(bind.id)} `;
    }

    if (bind.vendorId) {
      sql_where_clause += ` ${sql_where_clause.trim() ? ' and ' : 'where'} b.vendor_id = $${arrBind.push(bind.vendorId)} `;
    }

    const select: string = `
      select b.id,
              b.name,
              b.address_id "addressId",
              b.vendor_id "vendorId",
              b.create_date "createDate",
              b.update_date "updateDate",
              b.create_user "createUser",
              b.update_user "updateUser"
      from invoice_system.branch b
      ${sql_where_clause}
    `;

    const { rows } = await conn.query(select, arrBind);
    return bind.id ? rows[0] : rows;
  } catch (err) {
    throw err;
  }
}

export { branch_post_db, branch_get_db };
