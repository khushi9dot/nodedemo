import mongoose from "mongoose";
import { DB_NAME } from "../constants.js"

const dbconnect=async ()=>{
    try{
        const dbconnectInstance=await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        console.log(` mongodb connected..!!${dbconnectInstance.connection.host}`);
    }catch(error)
    {
        console.log("database connection error:",error);
        process.exit(1);
    }
    
}

export default dbconnect