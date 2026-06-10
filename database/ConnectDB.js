import mongoose from "mongoose";

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const connectDB = async (retryCount = 0) => {
    try {
        const conn = await mongoose.connect(process.env.CONECTDBB, {
             serverSelectionTimeoutMS: 5000, //Without this, Mongoose may wait much longer.
            retryWrites: true
        });
        
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        if (retryCount < MAX_RETRIES) {
            const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
            console.log(`Connection attempt ${retryCount + 1} failed (${error.name}: ${error.message}). Retrying in ${delay/1000} seconds...`);
            await sleep(delay);
            return connectDB(retryCount + 1);
        } else {
            console.error('Max retries reached. Could not connect to MongoDB:', error);
            process.exit(1);
        }
    }
};

export default connectDB;