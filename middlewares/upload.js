import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";

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

      const filename =
        Date.now() + "-" + Math.round(Math.random() * 1e9) + ".png";

      const filepath = path.join(uploadPath, filename);

      await sharp(req.file.buffer, { limitInputPixels: 16000000 })
        .rotate()
        .resize({
          width: 500,
          height: 500,
          fit: "contain",
          position: "centre",
          background: {
            r: 0,
            g: 0,
            b: 0,
            alpha: 0,
          },
          withoutEnlargement: true,
        })
        .png({
          compressionLevel: 9,
        })
        .toFile(filepath);

      req.file.filename = filename;

      next();
    } catch (err) {
      console.error(err);

      return res.status(500).json({
        success: false,
        message: "Gagal compress image",
      });
    }
  };

  return {
    single: (fieldName) => [upload.single(fieldName), compressImage],
  };
};

export default createUploader;
