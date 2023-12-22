async function contact_post_db(conn: any, bind: any) {
  try {
    const arrBind = [bind.vendorId, bind.name, bind.email, bind.phone, bind.userData?.authUsername?.toUpperCase()];

    const query = `
        insert into invoice_system.contact(vendor_id, name, email, phone, create_date, create_user, update_date, update_user)
        values ($1, $2, $3, $4, current_timestamp, $5, current_timestamp, $5)
        returning id
      `;

    const {
      rows: {
        [0]: { id },
      },
    } = await conn.query(query, arrBind);

    return id;
  } catch (error: any) {
    throw error.message || error;
  }
}

async function contact_get_db(conn: any, bind: any): Promise<any> {
  try {
    let sql_where_clause: any = '';
    const arrBind = [];

    if (bind.id) {
      sql_where_clause += ` ${sql_where_clause.trim() ? ' and ' : 'where'} c.id = $${arrBind.push(bind.id)} `;
    }

    if (bind.vendorId) {
      sql_where_clause += ` ${sql_where_clause.trim() ? ' and ' : 'where'} c.vendor_id = $${arrBind.push(bind.vendorId)} `;
    }

    const select: string = `
            select c.id,
                    c.name,
                    c.email,
                    c.phone,
                    c.create_date "createDate",
                    c.update_date "updateDate",
                    c.create_user "createUser",
                    c.update_user "updateUser"
            from invoice_system.contact c
            ${sql_where_clause}
          `;

    const { rows } = await conn.query(select, arrBind);

    return bind.id ? rows[0] : rows;
  } catch (err: any) {
    throw err.message ? err.message : err;
  }
}

export { contact_post_db, contact_get_db };
