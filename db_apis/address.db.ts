import { PoolClient } from 'pg';
import log from '../config/logger';

interface InsertAddressBind {
  cityCode: string;
  streetName: string;
  buildingNo: string;
  officeNo: string;
  zipCode: string;
}

interface AddressDBModel extends InsertAddressBind {
  id: number;
  createUser: string;
  updateUser: string;
  createDate: Date;
  updateDate: Date;
  cityName: string;
  stateName: string;
  countryName: string;
}

interface AddressSelectBind {
  id?: string;
  cityCode?: string;
  streetName?: string;
  buildingNo?: string;
  officeNo?: string;
  zipCode?: string;
}

async function insert_address(conn: PoolClient, bind: InsertAddressBind): Promise<number> {
  try {
    const binds = [];
    const query = `
      insert into invoice_system.address (
          city_code,
          street_name,
          building_no,
          office_no,
          zip_code
      ) values (
          $${binds.push(bind.cityCode)},
          $${binds.push(bind.streetName)},
          $${binds.push(bind.buildingNo)},
          $${binds.push(bind.officeNo)},
          $${binds.push(bind.zipCode)}
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

async function select_addresses(conn: PoolClient, bind: AddressSelectBind): Promise<AddressDBModel[]> {
  try {
    const binds = [];
    const sql = `
      select
        a.id,
        a.city_code as "cityCode",
        a.street_name as "streetName",
        a.building_no as "buildingNo",
        a.office_no as "officeNo",
        a.zip_code as "zipCode",
        a.create_date as "createDate",
        a.update_date as "updateDate",
        a.create_user as "createUser",
        a.update_user as "updateUser",
        c.name as "cityName",
        s.name as "stateName",
        cn.name as "countryName"
      from
        invoice_system.address a,
        invoice_system.city c,
        invoice_system.state s,
        invoice_system.country cn
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

    console.log(whereString);

    const { rows } = await conn.query<AddressDBModel>(`${sql} ${whereString}`, binds);

    return rows;
  } catch (error) {
    log.error(`Address select error: ${error}`);

    throw error;
  }
}

export { insert_address, select_addresses };
