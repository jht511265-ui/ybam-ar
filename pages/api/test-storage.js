// pages/api/test-storage.js
import { CloudinaryStorage } from '../../lib/cloudinary-storage';

export default async function handler(req, res) {
  try {
    console.log('测试 Cloudinary 存储...');
    
    // 测试获取所有项目
    const projects = await CloudinaryStorage.getAllProjects();
    
    // 测试保存一个项目
    const testProject = {
      _id: 'test_' + Date.now(),
      name: '测试项目',
      originalImage: 'https://via.placeholder.com/800x600',
      videoURL: 'https://example.com/video.mp4',
      status: '测试',
      createdAt: new Date()
    };
    
    const saveResult = await CloudinaryStorage.saveProject(testProject);
    
    res.status(200).json({
      success: true,
      message: 'Cloudinary 存储测试完成',
      projectsCount: projects.length,
      saveTest: saveResult,
      existingProjects: projects.slice(0, 3) // 只显示前3个项目
    });
    
  } catch (error) {
    console.error('存储测试失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
