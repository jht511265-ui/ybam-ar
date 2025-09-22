// pages/api/upload-base64.js
import { v2 as cloudinary } from 'cloudinary';

// 配置 Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    console.log('文件上传API被调用');
    
    const { files } = req.body;

    if (!files) {
      return res.status(400).json({
        success: false,
        error: '缺少文件数据'
      });
    }

    console.log('接收到文件:', Object.keys(files));

    const uploadResults = {};

    // 检查 Cloudinary 配置
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      console.warn('Cloudinary 配置缺失，使用模拟上传');
      
      // 模拟上传（开发用）
      if (files.originalImage) {
        uploadResults.originalImage = 'https://via.placeholder.com/800x600/4e54c8/ffffff?text=Original+Image';
        uploadResults.originalImagePublicId = 'mock_original_image';
      }
      if (files.arVideo) {
        uploadResults.videoURL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
        uploadResults.videoPublicId = 'mock_ar_video';
      }
      if (files.markerImage) {
        uploadResults.markerImage = 'https://via.placeholder.com/400x400/fdbb2d/000000?text=Marker+Image';
        uploadResults.markerImagePublicId = 'mock_marker_image';
      }
      
    } else {
      // 真实 Cloudinary 上传
      if (files.originalImage) {
        const result = await cloudinary.uploader.upload(files.originalImage, {
          folder: 'ar-projects/original-images',
          resource_type: 'image'
        });
        uploadResults.originalImage = result.secure_url;
        uploadResults.originalImagePublicId = result.public_id;
      }

      if (files.arVideo) {
        const result = await cloudinary.uploader.upload(files.arVideo, {
          folder: 'ar-projects/ar-videos',
          resource_type: 'video'
        });
        uploadResults.videoURL = result.secure_url;
        uploadResults.videoPublicId = result.public_id;
      }

      if (files.markerImage) {
        const result = await cloudinary.uploader.upload(files.markerImage, {
          folder: 'ar-projects/marker-images',
          resource_type: 'image'
        });
        uploadResults.markerImage = result.secure_url;
        uploadResults.markerImagePublicId = result.public_id;
      }
    }

    console.log('文件上传完成:', uploadResults);

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
