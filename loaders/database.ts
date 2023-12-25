import { Pool, types } from 'pg';

types.setTypeParser(1114, function (stringValue: any) {
  return stringValue;
});
types.setTypeParser(1082, function (stringValue: any) {
  return stringValue;
});

export default new Pool({
  max: 5,
  connectionString: process.env.DB_STRING,
  idleTimeoutMillis: 30000,
  ssl: {
    rejectUnauthorized: false,
  },
});
