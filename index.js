import "dotenv/config";
import express from "express";
import connectDB from "./database/ConnectDB.js";
import { securityRedis } from "./src/Services/securityStore.services.js";

await connectDB();
if (securityRedis) await securityRedis.connect();
// The rate limiters initialize their Redis scripts when the routers are loaded.
const { default: initApp } = await import("./src/app.router.js");
const app = express();
initApp(app, express);

const port = process.env.PORT || 3000;
const host = process.env.NODE_ENV === "production" ? "localhost" : undefined;
app.listen(port, host, () => {
  console.log(`Abuzaid Mosque backend listening on port ${port}`);
});
