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
    
    // 对于所有请求都需要验证token（包括GET）
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
    
    if (req.method === 'GET') {
      console.log('📥 获取项目列表请求');
      const projects = await CloudinaryStorage.getAllProjects();
      console.log('✅ 返回项目列表，数量:', projects.length);
      return res.status(200).json(projects);
    } 
    else if (req.method === 'POST') {
      console.log('🆕 创建新项目请求');
      
      if (!req.body) {
        console.log('❌ 请求体为空');
        return res.status(400).json({ message: '请求体不能为空' });
      }
      
      const { name, originalImage, videoURL, markerImage, cloudinaryData } = req.body;
      
      // 详细的验证和日志
      console.log('📦 接收到的项目数据:', {
        名称: name,
        图像: originalImage ? '已提供' : '缺失',
        视频: videoURL ? '已提供' : '缺失',
        标记: markerImage ? '已提供' : '缺失'
      });
      
      if (!name || !originalImage || !videoURL) {
        console.log('❌ 缺少必要字段:', { 
          name: !!name, 
          originalImage: !!originalImage, 
          videoURL: !!videoURL 
        });
        return res.status(400).json({ 
          message: '请填写项目名称并上传所有必需文件',
          missing: {
            name: !name,
            originalImage: !originalImage,
            videoURL: !videoURL
          }
        });
      }
      
      // 验证URL格式
      if (originalImage && !originalImage.startsWith('http')) {
        console.warn('⚠️ 原始图像URL格式可能有问题:', originalImage);
      }
      if (videoURL && !videoURL.startsWith('http')) {
        console.warn('⚠️ 视频URL格式可能有问题:', videoURL);
      }
      
      // 生成项目ID - 统一使用 project_ 前缀
      const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const project = {
        _id: projectId,
        name: name.trim(),
        originalImage,
        videoURL,
        markerImage: markerImage || originalImage,
        cloudinaryData: cloudinaryData || {},
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'admin'
      };
      
      console.log('📤 准备保存项目:', projectId);
      console.log('项目数据:', {
        name: project.name,
        image: project.originalImage?.substring(0, 50) + '...',
        video: project.videoURL?.substring(0, 50) + '...'
      });
      
      const saveResult = await CloudinaryStorage.saveProject(project);
      
      if (!saveResult.success) {
        console.log('❌ 保存项目失败:', saveResult.error);
        return res.status(500).json({ 
          message: '保存项目失败',
          error: saveResult.error 
        });
      }
      
      console.log('✅ 项目创建成功:', projectId);
      console.log('Cloudinary Public ID:', saveResult.publicId);
      
      return res.status(201).json(project);
    }
    else if (req.method === 'DELETE') {
      console.log('🗑️ 删除项目请求');
      console.log('请求体:', req.body);
      
      // 修复：从查询参数获取ID，兼容请求体方式
      let projectId = req.body?.id;
      
      // 如果没有在body中找到，尝试从查询参数获取
      if (!projectId && req.query.id) {
        projectId = req.query.id;
      }
      
      if (!projectId) {
        console.log('❌ 项目ID为空');
        return res.status(400).json({ message: '项目ID不能为空' });
      }
      
      console.log('准备删除项目ID:', projectId);
      
      // 先验证项目是否存在
      const projects = await CloudinaryStorage.getAllProjects();
      const projectExists = projects.some(p => p._id === projectId);
      
      if (!projectExists) {
        console.log('❌ 项目不存在:', projectId);
        return res.status(404).json({ message: '项目不存在' });
      }
      
      const deleteResult = await CloudinaryStorage.deleteProject(projectId);
      
      if (!deleteResult.success) {
        console.log('❌ 删除项目失败:', deleteResult.error);
        return res.status(500).json({ 
          message: '项目删除失败',
          error: deleteResult.error 
        });
      }
      
      console.log('✅ 项目删除成功:', projectId);
      
      return res.status(200).json({ 
        message: '项目删除成功',
        deletedId: projectId 
      });
    }
    else {
      console.log('❌ 方法不允许:', req.method);
      return res.status(405).json({ message: '方法不允许' });
    }
  } catch (error) {
    console.error('💥 Projects API 错误:', error);
    return res.status(500).json({ 
      message: '服务器内部错误',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
