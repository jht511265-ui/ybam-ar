import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

// 配置 Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 配置内存存储
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 禁用 bodyParser，让 multer 处理
export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadMiddleware = upload.fields([
  { name: 'originalImage', maxCount: 1 },
  { name: 'arVideo', maxCount: 1 },
  { name: 'markerImage', maxCount: 1 }
]);

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    // 运行 multer 中间件
    await runMiddleware(req, res, uploadMiddleware);

    const files = req.files;
    const uploadResults = {};

    // 上传原始图像
    if (files.originalImage && files.originalImage[0]) {
      const originalImageResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'ar-projects/original-images' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(files.originalImage[0].buffer);
      });
      uploadResults.originalImage = originalImageResult.secure_url;
    }

    // 上传 AR 视频
    if (files.arVideo && files.arVideo[0]) {
      const arVideoResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { 
            folder: 'ar-projects/ar-videos',
            resource_type: 'video'
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(files.arVideo[0].buffer);
      });
      uploadResults.videoURL = arVideoResult.secure_url;
    }

    // 上传标记图像
    if (files.markerImage && files.markerImage[0]) {
      const markerImageResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'ar-projects/marker-images' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(files.markerImage[0].buffer);
      });
      uploadResults.markerImage = markerImageResult.secure_url;
    }

    res.status(200).json({
      success: true,
      message: '文件上传成功',
      data: uploadResults
    });

  } catch (error) {
    console.error('文件上传错误:', error);
    res.status(500).json({
      success: false,
      error: '文件上传失败',
      message: error.message
    });
  }
}
