import dotenv from "dotenv";
import dbconnect from "./dbs/index.js";
import { app } from "./app.js";

dotenv.config({path:'./.env'})

dbconnect()
.then(()=>{
    app.listen(process.env.PORT || 8000 , ()=>{
        console.log(`server running at :${process.env.PORT}`);
})
})
.catch((err)=>{
    console.log(`mongodb connection failed:!!`,err);
})