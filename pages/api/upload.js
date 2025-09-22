import { v2 as cloudinary } from 'cloudinary';

// 配置 Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { files } = req.body;

    if (!files || !files.originalImage || !files.arVideo) {
      return res.status(400).json({
        success: false,
        error: '缺少必要的文件'
      });
    }

    const uploadResults = {};

    // 上传原始图像到 Cloudinary
    try {
      const originalImageResult = await cloudinary.uploader.upload(files.originalImage, {
        folder: 'ar-projects/original-images',
        resource_type: 'image'
      });
      uploadResults.originalImage = originalImageResult.secure_url;
      uploadResults.originalImagePublicId = originalImageResult.public_id;
    } catch (error) {
      console.error('原始图像上传失败:', error);
      return res.status(500).json({
        success: false,
        error: '原始图像上传失败'
      });
    }

    // 上传 AR 视频到 Cloudinary
    try {
      const arVideoResult = await cloudinary.uploader.upload(files.arVideo, {
        folder: 'ar-projects/ar-videos',
        resource_type: 'video'
      });
      uploadResults.videoURL = arVideoResult.secure_url;
      uploadResults.videoPublicId = arVideoResult.public_id;
    } catch (error) {
      console.error('AR视频上传失败:', error);
      return res.status(500).json({
        success: false,
        error: 'AR视频上传失败'
      });
    }

    // 上传标记图像（可选）
    if (files.markerImage) {
      try {
        const markerImageResult = await cloudinary.uploader.upload(files.markerImage, {
          folder: 'ar-projects/marker-images',
          resource_type: 'image'
        });
        uploadResults.markerImage = markerImageResult.secure_url;
        uploadResults.markerImagePublicId = markerImageResult.public_id;
      } catch (error) {
        console.error('标记图像上传失败:', error);
        // 标记图像上传失败不影响主要功能
      }
    }

    res.status(200).json({
      success: true,
      message: '所有文件上传成功',
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
