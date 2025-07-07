import dotenv from 'dotenv';
dotenv.config();

import { handleEvent } from './event-handler';

handleEvent().catch((err) => {
  console.error('Service failed to start', err);
  process.exit(1);
});
