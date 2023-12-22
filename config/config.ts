import nconf from 'nconf';
import log from './logger';
import dotenv from 'dotenv';
dotenv.config();
const config: string =
  process.env.NODE_ENV === 'development'
    ? '/config/config_test.json'
    : process.env.NODE_ENV === 'staging'
    ? '/config/config_staging.json'
    : '/config/config_prod.json';

log.info(`Config: ${config}`);
nconf
  .argv()
  .env()
  .file({
    file: process.cwd() + config,
  });

export default nconf;
