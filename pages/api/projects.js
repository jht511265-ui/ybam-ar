// pages/api/projects.js
import { verifyToken } from './auth';

// 使用内存存储项目数据
let projectsStorage = [];

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    console.log('Projects API 被调用，方法:', req.method);
    
    // 对于GET请求，不需要验证token（允许前端获取项目列表）
    if (req.method !== 'GET') {
      // 验证 token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: '未授权访问' });
      }
      
      const token = authHeader.split(' ')[1];
      let decoded;
      
      try {
        decoded = verifyToken(token);
        console.log('Token验证成功，用户:', decoded.username);
      } catch (error) {
        return res.status(401).json({ message: 'Token无效' });
      }
    }
    
    if (req.method === 'GET') {
      console.log('返回项目列表，数量:', projectsStorage.length);
      res.status(200).json(projectsStorage);
    } 
    else if (req.method === 'POST') {
      console.log('创建新项目，数据:', req.body);
      const { name, originalImage, videoURL, markerImage, cloudinaryData } = req.body;
      
      if (!name || !originalImage || !videoURL) {
        return res.status(400).json({ message: '请填写项目名称并上传所有必需文件' });
      }
      
      const project = {
        _id: Date.now().toString(),
        name,
        originalImage,
        videoURL,
        markerImage: markerImage || originalImage,
        cloudinaryData: cloudinaryData || {},
        status: '已发布',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin'
      };
      
      projectsStorage.push(project);
      console.log('项目创建成功，ID:', project._id);
      
      res.status(201).json(project);
    }
    else if (req.method === 'DELETE') {
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ message: '项目ID不能为空' });
      }
      
      const initialLength = projectsStorage.length;
      projectsStorage = projectsStorage.filter(p => p._id !== id);
      const deletedCount = initialLength - projectsStorage.length;
      
      if (deletedCount === 0) {
        return res.status(404).json({ message: '项目未找到' });
      }
      
      res.status(200).json({ message: '项目删除成功' });
    }
    else {
      res.status(405).json({ message: '方法不允许' });
    }
  } catch (error) {
    console.error('Projects API 错误:', error);
    res.status(500).json({ 
      message: '服务器内部错误',
      error: error.message 
    });
  }
}
