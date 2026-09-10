import { startGateway } from './index.mjs';
// This entry point always uses the deployment boundary, even without an env file.
process.env.GATEWAY_MODE = 'persistent';
startGateway();
