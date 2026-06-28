import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Dynamic storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = 'public/uploads';

    if (file.fieldname === 'videoFile') {
      uploadPath = path.join(uploadPath, 'videos');
    } else if (file.fieldname === 'thumbnailUrl' || file.fieldname === 'avatar' || file.fieldname === 'banner') {
      uploadPath = path.join(uploadPath, 'images');
    }

    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  },
});

// File filter validation
const fileFilter = (req, file, cb) => {
  const filetypes = {
    videoFile: /mp4|mkv|webm|avi|mov/,
    thumbnailUrl: /jpeg|jpg|png|webp/,
    avatar: /jpeg|jpg|png|webp/,
    banner: /jpeg|jpg|png|webp/,
  };

  const extension = path.extname(file.originalname).toLowerCase();

  const regex = filetypes[file.fieldname];
  if (!regex) {
    return cb(new Error('Unexpected file field'), false);
  }

  const isExtValid = regex.test(extension);
  
  if (isExtValid) {
    return cb(null, true);
  } else {
    return cb(new Error(`Invalid file type for ${file.fieldname}. Supported: ${regex.toString()}`), false);
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max for videos, images will be validated inside controllers or let multer reject larger
  },
});
