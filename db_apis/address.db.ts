import { PoolClient } from 'pg';
import log from '../config/logger';
import { AddressDBModel, AddressSelectBind, InsertAddressBind } from '../interfaces/address.interface';

async function address_post_db(conn: PoolClient, bind: InsertAddressBind): Promise<number> {
  try {
    const binds = [];
    const query = `
      insert into invoice_system.address (
          city_code,
          street_name,
          building_no,
          office_no,
          zip_code,
          create_user,
          update_user,
          create_date,
          update_date
      ) values (
          $${binds.push(bind.cityCode)},
          $${binds.push(bind.streetName)},
          $${binds.push(bind.buildingNo)},
          $${binds.push(bind.officeNo)},
          $${binds.push(bind.zipCode)},
          $${binds.push(bind.userData.authUsername?.toUpperCase())},
          $${binds.push(bind.userData.authUsername?.toUpperCase())},
          current_timestamp,
          current_timestamp
      ) returning id
    `;

    const {
      rows: [{ id }],
    } = await conn.query<{ id: number }>(query, binds);

    return id;
  } catch (error) {
    log.error(`Address insert error: ${error}`);

    throw error;
  }
}

async function address_get_db(conn: PoolClient, bind: AddressSelectBind): Promise<AddressDBModel[]> {
  try {
    const binds = [];
    const sql = `
      select
        a.id,
        a.city_code "cityCode",
        c.name "cityName",
        c.state_code "stateCode",
        s.name as "stateName",
        s.country_code as "countryCode",
        cn.name as "countryName",
        a.street_name as "streetName",
        a.building_no as "buildingNo",
        a.office_no as "officeNo",
        a.zip_code as "zipCode",
        a.create_date as "createDate",
        a.update_date as "updateDate",
        a.create_user as "createUser",
        a.update_user as "updateUser"
      from invoice_system.address a 
      join invoice_system.city c on a.city_code = c.code
      join invoice_system.state s on c.state_code = s.code
      join invoice_system.country cn on s.country_code = cn.code
    `;

    let where: string[] = [];

    if (bind.id) {
      where.push(`a.id = $${binds.push(bind.id)}`);
    }

    if (bind.cityCode) {
      where.push(`a.city_code = $${binds.push(bind.cityCode)}`);
    }

    if (bind.buildingNo) {
      where.push(`a.building_no = $${binds.push(bind.buildingNo)}`);
    }

    if (bind.officeNo) {
      where.push(`a.office_no = $${binds.push(bind.officeNo)}`);
    }

    if (bind.streetName) {
      where.push(`a.street_name = $${binds.push(bind.streetName)}`);
    }

    if (bind.zipCode) {
      where.push(`a.zip_code = $${binds.push(bind.zipCode)}`);
    }

    const whereString = where.map((whr, i) => (i === 0 ? `where ${whr}` : ` and ${whr}`)).join(' ');

    const { rows } = await conn.query<AddressDBModel>(`${sql} ${whereString}`, binds);

    return rows;
  } catch (error) {
    log.error(`Address select error: ${error}`);

    throw error;
  }
}

export { address_post_db, address_get_db };
