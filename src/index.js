import { loadConfig } from "./config.js";
import { FileStore } from "./storage.js";
import { createServer } from "./server.js";

const config = loadConfig();
const store = new FileStore(config.storageDir);
await store.init();

const app = createServer({ config, store });
app.listen(config.port, () => {
  console.log(`AUTARQ Office Portal listening on ${config.port}`);
});
