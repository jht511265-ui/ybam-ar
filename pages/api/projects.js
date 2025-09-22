import clientPromise from '../../lib/mongodb';
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
    console.log('正在连接 MongoDB...');
    
    // 测试 MongoDB 连接
    const client = await clientPromise;
    
    // 检查连接状态
    try {
      await client.db().admin().ping();
      console.log('MongoDB 连接成功');
    } catch (pingError) {
      console.error('MongoDB 连接测试失败:', pingError);
      return res.status(500).json({ 
        message: '数据库连接失败',
        error: pingError.message 
      });
    }
    
    const db = client.db('ar-project');
    
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
        console.error('Token验证失败:', error);
        return res.status(401).json({ message: 'Token无效' });
      }
    }
    
    if (req.method === 'GET') {
      console.log('获取项目列表');
      try {
        const projects = await db.collection('projects').find({}).sort({ createdAt: -1 }).toArray();
        console.log(`成功获取 ${projects.length} 个项目`);
        res.status(200).json(projects);
      } catch (dbError) {
        console.error('数据库查询错误:', dbError);
        res.status(500).json({ message: '获取项目列表失败' });
      }
    } 
    else if (req.method === 'POST') {
      console.log('创建新项目，数据:', req.body);
      const { name, originalImage, videoURL, markerImage } = req.body;
      
      if (!name || !originalImage || !videoURL) {
        return res.status(400).json({ 
          message: '请填写项目名称并上传所有必需文件',
          missing: {
            name: !name,
            originalImage: !originalImage,
            videoURL: !videoURL
          }
        });
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
      
      try {
        const result = await db.collection('projects').insertOne(project);
        console.log('项目创建成功，ID:', result.insertedId);
        res.status(201).json({ 
          ...project, 
          _id: result.insertedId,
          message: '项目创建成功'
        });
      } catch (dbError) {
        console.error('数据库插入错误:', dbError);
        res.status(500).json({ message: '创建项目失败' });
      }
    }
    else if (req.method === 'PUT') {
      console.log('更新项目，数据:', req.body);
      const { id, name, originalImage, videoURL, markerImage } = req.body;
      
      if (!id || !name) {
        return res.status(400).json({ 
          message: '项目ID和名称不能为空',
          missing: {
            id: !id,
            name: !name
          }
        });
      }
      
      const updateData = {
        name,
        updatedAt: new Date()
      };
      
      if (originalImage) updateData.originalImage = originalImage;
      if (videoURL) updateData.videoURL = videoURL;
      if (markerImage) updateData.markerImage = markerImage;
      
      try {
        const result = await db.collection('projects').updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
          return res.status(404).json({ message: '项目未找到' });
        }
        
        console.log('项目更新成功，影响文档数:', result.modifiedCount);
        res.status(200).json({ 
          message: '项目更新成功',
          modifiedCount: result.modifiedCount 
        });
      } catch (dbError) {
        console.error('数据库更新错误:', dbError);
        res.status(500).json({ message: '更新项目失败' });
      }
    }
    else if (req.method === 'DELETE') {
      console.log('删除项目，ID:', req.body.id);
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ message: '项目ID不能为空' });
      }
      
      try {
        const result = await db.collection('projects').deleteOne({ 
          _id: new ObjectId(id) 
        });
        
        if (result.deletedCount === 0) {
          return res.status(404).json({ message: '项目未找到' });
        }
        
        console.log('项目删除成功，删除文档数:', result.deletedCount);
        res.status(200).json({ 
          message: '项目删除成功',
          deletedCount: result.deletedCount 
        });
      } catch (dbError) {
        console.error('数据库删除错误:', dbError);
        res.status(500).json({ message: '删除项目失败' });
      }
    }
    else {
      res.status(405).json({ message: '方法不允许' });
    }
  } catch (error) {
    console.error('API严重错误:', error);
    
    // 更详细的错误分类
    if (error.name === 'MongoServerError') {
      if (error.code === 8000) {
        return res.status(500).json({ 
          message: '数据库认证失败，请检查MongoDB连接字符串',
          error: 'Authentication failed'
        });
      }
      return res.status(500).json({ 
        message: '数据库服务器错误',
        error: error.message 
      });
    }
    
    if (error.name === 'MongoNetworkError') {
      return res.status(500).json({ 
        message: '数据库网络连接错误',
        error: 'Network error'
      });
    }
    
    res.status(500).json({ 
      message: '服务器内部错误',
      error: error.message 
    });
  }
}
