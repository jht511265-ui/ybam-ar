// pages/api/test-connection.js
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function handler(req, res) {
  try {
    // 测试 Cloudinary 配置
    const result = await cloudinary.api.ping();
    
    res.status(200).json({
      success: true,
      message: 'Cloudinary 连接正常',
      cloudinary: {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? '已配置' : '未配置',
        api_key: process.env.CLOUDINARY_API_KEY ? '已配置' : '未配置',
        api_secret: process.env.CLOUDINARY_API_SECRET ? '已配置' : '未配置'
      },
      ping: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Cloudinary 连接失败',
      message: error.message
    });
  }
}
