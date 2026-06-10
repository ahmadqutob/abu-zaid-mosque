import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.cloudinary_name;
const apiKey = process.env.CLOUDINARY_API_KEY || process.env.cloudinary_api_key;
const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.cloudinary_api_Sercret || process.env.cloudinary_api_secret;

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

export default cloudinary
