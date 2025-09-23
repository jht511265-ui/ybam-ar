// pages/api/upload-base64.js
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: '方法不允许' });

  try {
    console.log('=== 文件上传开始 ===');
    
    const { files } = req.body;
    console.log('接收到的文件keys:', files ? Object.keys(files) : '无文件');

    if (!files || Object.keys(files).length === 0) {
      return res.status(400).json({
        success: false,
        error: '没有接收到任何文件数据'
      });
    }

    const uploadResults = {};
    const uploadPromises = [];

    // 检查 Cloudinary 配置
    const hasCloudinaryConfig = process.env.CLOUDINARY_CLOUD_NAME && 
                               process.env.CLOUDINARY_API_KEY && 
                               process.env.CLOUDINARY_API_SECRET;

    if (!hasCloudinaryConfig) {
      console.warn('Cloudinary 配置缺失，使用模拟上传');
      
      // 模拟上传 - 添加延迟模拟真实上传
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (files.originalImage) {
        uploadResults.originalImage = 'https://via.placeholder.com/800x600/4e54c8/ffffff?text=Original+Image';
        uploadResults.originalImagePublicId = 'mock_original_' + Date.now();
      }
      if (files.arVideo) {
        uploadResults.videoURL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
        uploadResults.videoPublicId = 'mock_video_' + Date.now();
      }
      if (files.markerImage) {
        uploadResults.markerImage = 'https://via.placeholder.com/400x400/fdbb2d/000000?text=Marker+Image';
        uploadResults.markerImagePublicId = 'mock_marker_' + Date.now();
      }
    } else {
      console.log('使用真实 Cloudinary 上传');
      
      // 真实上传 - 并行处理所有文件
      if (files.originalImage) {
        uploadPromises.push(
          cloudinary.uploader.upload(files.originalImage, {
            folder: 'ar-projects/original-images',
            resource_type: 'image',
            transformation: [{ width: 800, height: 600, crop: 'limit' }]
          }).then(result => {
            uploadResults.originalImage = result.secure_url;
            uploadResults.originalImagePublicId = result.public_id;
            console.log('原始图像上传成功:', result.public_id);
          })
        );
      }

      if (files.arVideo) {
        uploadPromises.push(
          cloudinary.uploader.upload(files.arVideo, {
            folder: 'ar-projects/ar-videos',
            resource_type: 'video',
            chunk_size: 6000000 // 6MB chunks for large videos
          }).then(result => {
            uploadResults.videoURL = result.secure_url;
            uploadResults.videoPublicId = result.public_id;
            console.log('AR视频上传成功:', result.public_id);
          })
        );
      }

      if (files.markerImage) {
        uploadPromises.push(
          cloudinary.uploader.upload(files.markerImage, {
            folder: 'ar-projects/marker-images',
            resource_type: 'image',
            transformation: [{ width: 400, height: 400, crop: 'limit' }]
          }).then(result => {
            uploadResults.markerImage = result.secure_url;
            uploadResults.markerImagePublicId = result.public_id;
            console.log('标记图像上传成功:', result.public_id);
          })
        );
      }

      // 等待所有文件上传完成
      if (uploadPromises.length > 0) {
        await Promise.all(uploadPromises);
      }
    }

    console.log('=== 文件上传完成 ===', uploadResults);

    res.status(200).json({
      success: true,
      message: `成功上传 ${Object.keys(uploadResults).length} 个文件`,
      data: uploadResults
    });

  } catch (error) {
    console.error('文件上传错误:', error);
    res.status(500).json({
      success: false,
      error: '文件上传失败',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
