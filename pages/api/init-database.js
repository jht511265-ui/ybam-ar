// pages/api/init-database.js
import { getDatabase } from '../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const db = await getDatabase();
    
    // 创建 projects 集合
    await db.createCollection('projects');
    console.log('✅ 创建 projects 集合成功');
    
    // 创建示例数据
    const sampleProject = {
      name: '示例 AR 项目',
      originalImage: 'https://example.com/image.jpg',
      videoURL: 'https://example.com/video.mp4',
      markerImage: 'https://example.com/marker.jpg',
      status: '已发布',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
    
    const result = await db.collection('projects').insertOne(sampleProject);
    console.log('✅ 创建示例数据成功');
    
    // 创建索引
    await db.collection('projects').createIndex({ name: 1 });
    await db.collection('projects').createIndex({ createdAt: -1 });
    console.log('✅ 创建索引成功');
    
    res.status(200).json({
      success: true,
      message: '数据库初始化成功',
      database: db.databaseName,
      insertedId: result.insertedId,
      collections: await db.listCollections().toArray()
    });
    
  } catch (error) {
    console.error('数据库初始化失败:', error);
    
    if (error.codeName === 'NamespaceExists') {
      return res.status(200).json({
        success: true,
        message: '数据库已存在',
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
}
