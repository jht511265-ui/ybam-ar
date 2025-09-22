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
    // 检查是否是 multipart/form-data
    if (!req.headers['content-type']?.includes('multipart/form-data')) {
      return res.status(400).json({
        success: false,
        error: '请使用 multipart/form-data 格式上传文件'
      });
    }

    // 由于 Next.js 默认不解析 multipart/form-data，我们需要手动处理
    // 这里使用一个简单的解析方法
    const uploadResults = {};

    // 在实际部署中，建议使用像 formidable 这样的库来处理文件上传
    // 这里简化处理，假设文件已经通过中间件解析
    
    // 由于 Next.js API 路由的限制，我们需要使用外部库来处理文件上传
    // 暂时返回错误，提示需要配置正确的文件上传处理
    return res.status(500).json({
      success: false,
      error: '文件上传功能需要配置正确的 multipart 处理中间件'
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

// 替代方案：使用 base64 上传（保持你原来的方法）
export async function uploadBase64Files(filesBase64) {
  const uploadResults = {};

  try {
    // 上传原始图像到 Cloudinary
    if (filesBase64.originalImage) {
      const originalImageResult = await cloudinary.uploader.upload(filesBase64.originalImage, {
        folder: 'ar-projects/original-images',
        resource_type: 'image'
      });
      uploadResults.originalImage = originalImageResult.secure_url;
      uploadResults.originalImagePublicId = originalImageResult.public_id;
    }

    // 上传 AR 视频到 Cloudinary
    if (filesBase64.arVideo) {
      const arVideoResult = await cloudinary.uploader.upload(filesBase64.arVideo, {
        folder: 'ar-projects/ar-videos',
        resource_type: 'video'
      });
      uploadResults.videoURL = arVideoResult.secure_url;
      uploadResults.videoPublicId = arVideoResult.public_id;
    }

    // 上传标记图像（可选）
    if (filesBase64.markerImage) {
      const markerImageResult = await cloudinary.uploader.upload(filesBase64.markerImage, {
        folder: 'ar-projects/marker-images',
        resource_type: 'image'
      });
      uploadResults.markerImage = markerImageResult.secure_url;
      uploadResults.markerImagePublicId = markerImageResult.public_id;
    }

    return {
      success: true,
      data: uploadResults
    };
  } catch (error) {
    console.error('Cloudinary 上传错误:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
