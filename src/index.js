import dotenv from 'dotenv';
// require('dotenv').config({path:'./env'});
// import mongoose from 'mongoose';
// import { DB_Name } from './constants';
import connectDB from './db/index.js';

dotenv.config({
    path:'./env'
});
connectDB()










// approch 1
/*
import express from 'express';

const app = express();


(async ()=>{
    try {
        await mongoose.connect (`${process.env.MONGODB_URI} /${DB_Name}`)
        app.on("error", (error)=>{
            console.log("Error: ", error)
            throw error
        })

        app.listen(process.env.PORT, ()=>{
            console.log(`Server is running on port ${process.env.PORT}`)
        })
    }catch (error){
        console.error("Error: ", error)
        throw err
    }
})()

*/