import mongoose from 'mongoose';
import { DB_Name } from '../constants.js';

const connectDB = async ()=>{
    try{
       const uri = await mongoose.connect
        (`${process.env.MONGODB_URI}/${DB_Name}`)
        console.log(`\n MongoDB conected !! DB HOST :
         ${uri.connection.host}`)
    }catch (error){
        console.error("MONGODB connections Failed !!", error)
        process.exit(1)  // 1 means exit with failure
    }
}


export default connectDB