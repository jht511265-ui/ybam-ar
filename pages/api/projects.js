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
    console.log('=== Projects API 被调用 ===');
    console.log('方法:', req.method);
    console.log('URL:', req.url);
    console.log('请求头 authorization:', req.headers.authorization ? '存在' : '不存在');
    
    // 对于GET请求，不需要验证token
    if (req.method !== 'GET') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('❌ 未授权访问: 缺少token');
        return res.status(401).json({ message: '未授权访问' });
      }
      
      const token = authHeader.split(' ')[1];
      try {
        const decoded = verifyToken(token);
        console.log('✅ Token验证成功，用户:', decoded.username);
      } catch (error) {
        console.log('❌ Token无效:', error.message);
        return res.status(401).json({ message: 'Token无效' });
      }
    }
    
    if (req.method === 'GET') {
      console.log('📥 获取项目列表请求');
      const projects = await CloudinaryStorage.getAllProjects();
      console.log('✅ 返回项目列表，数量:', projects.length);
      return res.status(200).json(projects);
    } 
    else if (req.method === 'POST') {
      console.log('🆕 创建新项目请求');
      console.log('请求体:', req.body);
      
      if (!req.body) {
        console.log('❌ 请求体为空');
        return res.status(400).json({ message: '请求体不能为空' });
      }
      
      const { name, originalImage, videoURL, markerImage, cloudinaryData } = req.body;
      
      if (!name || !originalImage || !videoURL) {
        console.log('❌ 缺少必要字段:', { name: !!name, originalImage: !!originalImage, videoURL: !!videoURL });
        return res.status(400).json({ message: '请填写项目名称并上传所有必需文件' });
      }
      
      // 生成项目ID - 统一使用 project_ 前缀
      const projectId = `project_${Date.now()}`;
      
      const project = {
        _id: projectId,
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
      
      console.log('📤 准备保存项目:', projectId);
      
      const saveResult = await CloudinaryStorage.saveProject(project);
      
      if (!saveResult.success) {
        console.log('❌ 保存项目失败:', saveResult.error);
        throw new Error('保存项目失败: ' + saveResult.error);
      }
      
      console.log('✅ 项目创建成功:', projectId);
      
      return res.status(201).json(project);
    }
    else if (req.method === 'DELETE') {
      console.log('🗑️ 删除项目请求');
      console.log('请求体:', req.body);
      
      const { id } = req.body;
      
      if (!id) {
        console.log('❌ 项目ID为空');
        return res.status(400).json({ message: '项目ID不能为空' });
      }
      
      console.log('准备删除项目ID:', id);
      
      const deleteResult = await CloudinaryStorage.deleteProject(id);
      
      if (!deleteResult.success) {
        console.log('❌ 删除项目失败:', deleteResult.error);
        return res.status(404).json({ message: '项目删除失败: ' + deleteResult.error });
      }
      
      console.log('✅ 项目删除成功:', id);
      
      return res.status(200).json({ message: '项目删除成功' });
    }
    else {
      console.log('❌ 方法不允许:', req.method);
      return res.status(405).json({ message: '方法不允许' });
    }
  } catch (error) {
    console.error('💥 Projects API 错误:', error);
    return res.status(500).json({ 
      message: '服务器内部错误',
      error: error.message
    });
  }
}
