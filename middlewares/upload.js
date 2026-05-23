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
      fileSize: 10 * 1024 * 1024,
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
        Date.now() + "-" + Math.round(Math.random() * 1e9) + ".webp";

      const filepath = path.join(uploadPath, filename);

      await sharp(req.file.buffer)
        .rotate()

        .resize({
          width: 800,
          withoutEnlargement: true,
        })

        .webp({
          quality: 70,
        })

        .toFile(filepath);

      req.file.filename = filename;

      next();
    } catch (err) {
      console.error(err);

      res.status(500).json({
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
