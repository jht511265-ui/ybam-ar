import { getDatabase, testConnection } from '../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { verifyToken } from './auth';

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    console.log('正在连接数据库 cluster0...');
    
    // 测试连接
    const connectionTest = await testConnection();
    if (!connectionTest.success) {
      return res.status(500).json({ 
        message: '数据库连接失败',
        error: connectionTest.error,
        database: 'cluster0'
      });
    }
    
    console.log('成功连接到数据库 cluster0');
    
    // 获取数据库连接
    const db = await getDatabase();
    
    // 对于GET请求，不需要验证token
    if (req.method !== 'GET') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: '未授权访问' });
      }
      
      const token = authHeader.split(' ')[1];
      try {
        const decoded = verifyToken(token);
        console.log('Token验证成功，用户:', decoded.username);
      } catch (error) {
        return res.status(401).json({ message: 'Token无效' });
      }
    }
    
    // 业务逻辑
    if (req.method === 'GET') {
      console.log('从 cluster0 数据库获取项目列表');
      const projects = await db.collection('projects').find({}).sort({ createdAt: -1 }).toArray();
      console.log(`成功获取 ${projects.length} 个项目`);
      res.status(200).json(projects);
    } 
    else if (req.method === 'POST') {
      console.log('在 cluster0 数据库创建新项目');
      const { name, originalImage, videoURL, markerImage } = req.body;
      
      if (!name || !originalImage || !videoURL) {
        return res.status(400).json({ message: '请填写项目名称并上传所有必需文件' });
      }
      
      const project = {
        name,
        originalImage,
        videoURL,
        markerImage: markerImage || originalImage,
        status: '已发布',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin'
      };
      
      const result = await db.collection('projects').insertOne(project);
      console.log('项目创建成功，ID:', result.insertedId);
      res.status(201).json({ ...project, _id: result.insertedId });
    }
    else if (req.method === 'PUT') {
      console.log('在 cluster0 数据库更新项目');
      const { id, name, originalImage, videoURL, markerImage } = req.body;
      
      if (!id || !name) {
        return res.status(400).json({ message: '项目ID和名称不能为空' });
      }
      
      const updateData = {
        name,
        updatedAt: new Date()
      };
      
      if (originalImage) updateData.originalImage = originalImage;
      if (videoURL) updateData.videoURL = videoURL;
      if (markerImage) updateData.markerImage = markerImage;
      
      const result = await db.collection('projects').updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );
      
      if (result.matchedCount === 0) {
        return res.status(404).json({ message: '项目未找到' });
      }
      
      res.status(200).json({ message: '项目更新成功' });
    }
    else if (req.method === 'DELETE') {
      console.log('从 cluster0 数据库删除项目');
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ message: '项目ID不能为空' });
      }
      
      const result = await db.collection('projects').deleteOne({ 
        _id: new ObjectId(id) 
      });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: '项目未找到' });
      }
      
      res.status(200).json({ message: '项目删除成功' });
    }
    else {
      res.status(405).json({ message: '方法不允许' });
    }
    
  } catch (error) {
    console.error('数据库操作错误 (cluster0):', error);
    
    if (error.name === 'MongoServerError') {
      return res.status(500).json({ 
        message: '数据库服务器错误',
        error: error.message,
        database: 'cluster0'
      });
    }
    
    res.status(500).json({ 
      message: '服务器内部错误',
      error: error.message 
    });
  }
}
