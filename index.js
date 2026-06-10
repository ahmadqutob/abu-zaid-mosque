import initApp from "./src/app.router.js";
import express from 'express' //  import the express module to design api's &creating an Express.js application 
import dotenv from 'dotenv' // to save important information's
 
dotenv.config()
const app= express();
const port= process.env.PORT || 3000
 initApp(app,express)

app.listen( port , ()=>{
  console.log(`Abuzaid Mosque backend listening on port ${port}`);
});