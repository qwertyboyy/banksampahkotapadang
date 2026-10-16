import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { processUploadImage } from '../services/uploadImage.js';

const createUploader = (folder) => {
  const uploadPath = `uploads/${folder}`;

  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, {
      recursive: true,
    });
  }

  const storage = multer.memoryStorage();

  const upload = multer({
    storage,

    limits: {
      fileSize: 2 * 1024 * 1024,
    },

    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "image/webp",
      ];

      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Format file tidak didukung"), false);
      }
    },
  });

  const compressImage = async (req, res, next) => {
    try {
      if (!req.file) {
        return next();
      }

      const filename = `${randomUUID()}.png`;

      const filepath = path.join(uploadPath, filename);

      const output = await processUploadImage(req.file.buffer);
      await writeFile(filepath, output, { flag: 'wx' });

      req.file.filename = filename;

      next();
    } catch (err) {
      if (!err.status) console.error('upload_image_failed', err.code || err.name);

      return res.status(err.status || 500).json({
        success: false,
        message: err.status ? err.message : "Gagal menyimpan gambar",
      });
    }
  };

  return {
    single: (fieldName) => [upload.single(fieldName), compressImage],
  };
};

export default createUploader;
