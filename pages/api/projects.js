// pages/api/projects.js
import { verifyToken } from './auth';
import { CloudinaryStorage } from '../../lib/cloudinary-storage';

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
    console.log('请求体:', req.body);
    
    // 对于GET请求，不需要验证token（允许前端获取项目列表）
    if (req.method !== 'GET') {
      // 验证 token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('未授权访问: 缺少token');
        return res.status(401).json({ message: '未授权访问' });
      }
      
      const token = authHeader.split(' ')[1];
      let decoded;
      
      try {
        decoded = verifyToken(token);
        console.log('Token验证成功，用户:', decoded.username);
      } catch (error) {
        console.log('Token无效:', error.message);
        return res.status(401).json({ message: 'Token无效' });
      }
    }
    
    if (req.method === 'GET') {
      // 从 Cloudinary 获取所有项目
      const projects = await CloudinaryStorage.getAllProjects();
      console.log('返回项目列表，数量:', projects.length);
      res.status(200).json(projects);
    } 
    else if (req.method === 'POST') {
      console.log('创建新项目，数据:', req.body);
      
      if (!req.body) {
        return res.status(400).json({ message: '请求体不能为空' });
      }
      
      const { name, originalImage, videoURL, markerImage, cloudinaryData } = req.body;
      
      if (!name || !originalImage || !videoURL) {
        return res.status(400).json({ 
          message: '请填写项目名称并上传所有必需文件',
          received: { name, originalImage: !!originalImage, videoURL: !!videoURL }
        });
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
      
      // 保存到 Cloudinary
      const saveResult = await CloudinaryStorage.saveProject(project);
      
      if (!saveResult.success) {
        throw new Error('保存项目失败: ' + saveResult.error);
      }
      
      console.log('项目创建成功，ID:', project._id);
      
      res.status(201).json(project);
    }
    else if (req.method === 'DELETE') {
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ message: '项目ID不能为空' });
      }
      
      // 从 Cloudinary 删除项目
      const deleteResult = await CloudinaryStorage.deleteProject(id);
      
      if (!deleteResult.success) {
        return res.status(404).json({ message: '项目删除失败: ' + deleteResult.error });
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
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
