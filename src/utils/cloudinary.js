import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Configure credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a local file to Cloudinary and removes the local copy.
 * @param {string} localFilePath - Path to the file on the local server filesystem
 * @param {string} folderName - Cloudinary folder destination ('videos' or 'images')
 * @returns {object|null} Cloudinary response object or null if failed
 */
export const uploadToCloudinary = async (localFilePath, folderName) => {
  try {
    if (!localFilePath) return null;

    // Detect resource type based on folder/extension automatically
    const isVideo = folderName === 'videos';

    const response = await cloudinary.uploader.upload(localFilePath, {
      folder: `videoplatform/${folderName}`, 
      resource_type: isVideo ? 'video' : 'image',
    });

    // File uploaded successfully! Delete local copy to free up space
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    
    return response;
  } catch (error) {
    // Crucial: Clean up local file even if cloud upload failed to avoid server bloat
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    console.error('Cloudinary upload failed:', error);
    return null;
  }
};
