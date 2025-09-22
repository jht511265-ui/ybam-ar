import { IncomingForm } from 'formidable';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';

// 配置 Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    // 解析表单数据
    const data = await new Promise((resolve, reject) => {
      const form = new IncomingForm();
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve({ fields, files });
      });
    });

    const { files } = data;
    const uploadResults = {};

    // 上传原始图像
    if (files.originalImage) {
      const originalImageResult = await cloudinary.uploader.upload(
        files.originalImage.filepath,
        { folder: 'ar-projects/original-images' }
      );
      uploadResults.originalImage = originalImageResult.secure_url;
    }

    // 上传 AR 视频
    if (files.arVideo) {
      const arVideoResult = await cloudinary.uploader.upload(
        files.arVideo.filepath,
        { 
          folder: 'ar-projects/ar-videos',
          resource_type: 'video'
        }
      );
      uploadResults.videoURL = arVideoResult.secure_url;
    }

    // 上传标记图像（可选）
    if (files.markerImage) {
      const markerImageResult = await cloudinary.uploader.upload(
        files.markerImage.filepath,
        { folder: 'ar-projects/marker-images' }
      );
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
