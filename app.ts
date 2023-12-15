import dotenv from 'dotenv';
dotenv.config();

import log from './config/logger';
import { init, close } from './loaders/web-server';

async function startUp() {
  log.info('Starting application');
  try {
    log.info('Initializing web server module');
    await init();
  } catch (error) {
    log.error(error);
    process.exit(1);
  }
}

startUp();

async function shutDown(error?: any): Promise<void> {
  log.info('Shutting down');
  try {
    log.info('Clossing web server module');
    await close();
  } catch (error) {
    log.info('Encountered error', error);
  }
  if (error) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => {
  log.info('Received SIGTERM');

  shutDown();
});

process.on('SIGINT', () => {
  log.info('Received SIGINT');

  shutDown();
});

process.on('uncaughtException', (error: any) => {
  log.info('Uncaught exception');
  log.error(error);

  shutDown(error);
});
