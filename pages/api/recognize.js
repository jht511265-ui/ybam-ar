import { getDatabase, testConnection } from '../../lib/mongodb';
import { v2 as cloudinary } from 'cloudinary';

// 配置 Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: '方法不允许' 
    });
  }

  try {
    console.log('图像识别 - 连接数据库 cluster0...');
    
    // 测试连接
    const connectionTest = await testConnection();
    if (!connectionTest.success) {
      return res.status(500).json({
        success: false,
        error: '数据库连接失败',
        message: connectionTest.error,
        database: 'cluster0'
      });
    }
    
    const db = await getDatabase();
    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({
        success: false,
        error: '缺少图像数据'
      });
    }

    console.log('从 cluster0 数据库获取项目数据...');
    const projects = await db.collection('projects').find({}).toArray();
    console.log(`成功获取 ${projects.length} 个项目`);

    if (projects.length === 0) {
      return res.status(404).json({
        success: false,
        error: '没有找到任何项目',
        database: 'cluster0'
      });
    }

    // 模拟图像识别
    const recognizedProject = projects[Math.floor(Math.random() * projects.length)];
    const confidence = Math.random() * 0.5 + 0.5;

    res.status(200).json({
      success: true,
      message: '图像识别成功',
      database: 'cluster0',
      data: {
        project: recognizedProject,
        confidence: confidence
      }
    });

  } catch (error) {
    console.error('图像识别错误 (cluster0):', error);
    res.status(500).json({
      success: false,
      error: '图像识别失败',
      message: error.message,
      database: 'cluster0'
    });
  }
}
