// pages/api/projects/index.js
import { verifyToken } from '../../../middleware/auth';
import { CloudinaryStorage } from '../../../../lib/cloudinary-storage';

export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    console.log('=== Projects API 被调用 ===');
    console.log('方法:', req.method);
    console.log('查询参数:', req.query);
    
    // 验证token
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
      return res.status(401).json({ message: 'Token无效或已过期' });
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
      
      console.log('📦 接收到的项目数据:', {
        名称: name,
        图像: originalImage ? '已提供' : '缺失',
        视频: videoURL ? '已提供' : '缺失'
      });
      
      if (!name || !originalImage || !videoURL) {
        console.log('❌ 缺少必要字段');
        return res.status(400).json({ 
          message: '请填写项目名称并上传所有必需文件'
        });
      }
      
      // 生成项目ID
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
        updatedAt: new Date().toISOString()
      };
      
      console.log('📤 准备保存项目:', projectId);
      const saveResult = await CloudinaryStorage.saveProject(project);
      
      if (!saveResult.success) {
        console.log('❌ 保存项目失败:', saveResult.error);
        return res.status(500).json({ 
          message: '保存项目失败',
          error: saveResult.error 
        });
      }
      
      console.log('✅ 项目创建成功:', projectId);
      return res.status(201).json({
        success: true,
        project: project
      });
    }
    else if (req.method === 'DELETE') {
      console.log('🗑️ 删除项目请求');
      
      // 从查询参数获取ID
      const projectId = req.query.id;
      
      if (!projectId) {
        console.log('❌ 项目ID为空');
        return res.status(400).json({ message: '项目ID不能为空' });
      }
      
      console.log('准备删除项目ID:', projectId);
      
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
        success: true,
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
      error: error.message
    });
  }
}
