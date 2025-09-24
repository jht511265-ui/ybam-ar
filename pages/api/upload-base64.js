// pages/api/upload-base64.js
import { v2 as cloudinary } from 'cloudinary';

// 配置 Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 设置CORS头
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// 提取 base64 数据
function extractBase64Data(dataUrl) {
  if (!dataUrl) return null;
  
  if (dataUrl.startsWith('data:')) {
    const matches = dataUrl.match(/^data:.+\/(.+);base64,(.*)$/);
    if (matches && matches.length === 3) {
      return matches[2]; // 返回纯base64数据
    }
  }
  
  return dataUrl; // 如果已经是纯base64，直接返回
}

export default async function handler(req, res) {
  setCorsHeaders(res);
  
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
    
    // 检查 Cloudinary 配置
    const hasCloudinaryConfig = process.env.CLOUDINARY_CLOUD_NAME && 
                               process.env.CLOUDINARY_API_KEY && 
                               process.env.CLOUDINARY_API_SECRET;

    if (!hasCloudinaryConfig) {
      console.warn('❌ Cloudinary 配置缺失，使用模拟上传');
      console.log('检查的环境变量:', {
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? '已设置' : '未设置',
        CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? '已设置' : '未设置',
        CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? '已设置' : '未设置'
      });
      
      // 模拟上传
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
      
      console.log('✅ 模拟上传完成');
    } else {
      console.log('✅ 使用真实 Cloudinary 上传');
      
      try {
        // 真实上传 - 串行处理
        if (files.originalImage) {
          console.log('开始上传原始图像...');
          const base64Data = extractBase64Data(files.originalImage);
          
          if (!base64Data) {
            throw new Error('原始图像数据格式错误');
          }
          
          const result = await cloudinary.uploader.upload(`data:image/jpeg;base64,${base64Data}`, {
            folder: 'ar-projects/original-images',
            resource_type: 'image',
            transformation: [{ width: 800, height: 600, crop: 'limit' }]
          });
          
          uploadResults.originalImage = result.secure_url;
          uploadResults.originalImagePublicId = result.public_id;
          console.log('✅ 原始图像上传成功:', result.public_id);
        }

        if (files.arVideo) {
          console.log('开始上传AR视频...');
          const base64Data = extractBase64Data(files.arVideo);
          
          if (!base64Data) {
            throw new Error('AR视频数据格式错误');
          }
          
          const result = await cloudinary.uploader.upload(`data:video/mp4;base64,${base64Data}`, {
            folder: 'ar-projects/ar-videos',
            resource_type: 'video',
            chunk_size: 6000000
          });
          
          uploadResults.videoURL = result.secure_url;
          uploadResults.videoPublicId = result.public_id;
          console.log('✅ AR视频上传成功:', result.public_id);
        }

        if (files.markerImage) {
          console.log('开始上传标记图像...');
          const base64Data = extractBase64Data(files.markerImage);
          
          if (!base64Data) {
            throw new Error('标记图像数据格式错误');
          }
          
          const result = await cloudinary.uploader.upload(`data:image/jpeg;base64,${base64Data}`, {
            folder: 'ar-projects/marker-images',
            resource_type: 'image',
            transformation: [{ width: 400, height: 400, crop: 'limit' }]
          });
          
          uploadResults.markerImage = result.secure_url;
          uploadResults.markerImagePublicId = result.public_id;
          console.log('✅ 标记图像上传成功:', result.public_id);
        }
      } catch (uploadError) {
        console.error('❌ Cloudinary 上传错误:', uploadError);
        throw new Error(`文件上传到 Cloudinary 失败: ${uploadError.message}`);
      }
    }

    console.log('=== 文件上传完成 ===', uploadResults);

    res.status(200).json({
      success: true,
      message: `成功上传 ${Object.keys(uploadResults).filter(k => uploadResults[k]).length} 个文件`,
      data: uploadResults
    });

  } catch (error) {
    console.error('❌ 文件上传错误:', error);
    res.status(500).json({
      success: false,
      error: '文件上传失败',
      message: error.message
    });
  }
}
