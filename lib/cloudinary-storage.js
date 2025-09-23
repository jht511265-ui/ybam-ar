// lib/cloudinary-storage.js
import { v2 as cloudinary } from 'cloudinary';

// 配置 Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 存储项目数据的文件夹
const STORAGE_FOLDER = 'ar-projects-data';

export class CloudinaryStorage {
  // 获取所有项目
  static async getAllProjects() {
    try {
      console.log('从 Cloudinary 获取项目数据...');
      
      // 搜索指定文件夹下的所有JSON文件
      const result = await cloudinary.search
        .expression(`resource_type:raw AND folder:${STORAGE_FOLDER}`)
        .sort_by('created_at', 'desc')
        .execute();
      
      console.log('找到文件数量:', result.resources?.length || 0);
      
      const projects = [];
      
      // 并行获取所有文件内容
      if (result.resources && result.resources.length > 0) {
        const fetchPromises = result.resources.map(async (resource) => {
          try {
            // 获取文件的下载URL
            const fileUrl = cloudinary.url(resource.public_id, {
              resource_type: 'raw',
              flags: 'attachment'
            });
            
            const response = await fetch(fileUrl);
            if (response.ok) {
              const projectData = await response.json();
              projects.push(projectData);
            }
          } catch (error) {
            console.error('获取文件内容失败:', error);
          }
        });
        
        await Promise.all(fetchPromises);
      }
      
      console.log('成功加载项目数量:', projects.length);
      return projects;
      
    } catch (error) {
      console.error('从 Cloudinary 获取项目失败:', error);
      return [];
    }
  }
  
  // 保存单个项目
  static async saveProject(project) {
    try {
      console.log('保存项目到 Cloudinary:', project._id);
      
      // 将项目数据转换为JSON字符串
      const projectJson = JSON.stringify(project, null, 2);
      
      // 创建文件名
      const fileName = `project_${project._id}.json`;
      const publicId = `${STORAGE_FOLDER}/${fileName}`;
      
      // 上传JSON文件到Cloudinary
      const result = await cloudinary.uploader.upload(
        `data:application/json;base64,${Buffer.from(projectJson).toString('base64')}`,
        {
          resource_type: 'raw',
          public_id: publicId,
          folder: STORAGE_FOLDER,
          overwrite: true
        }
      );
      
      console.log('项目保存成功:', result.public_id);
      return { success: true, publicId: result.public_id };
      
    } catch (error) {
      console.error('保存项目到 Cloudinary 失败:', error);
      return { success: false, error: error.message };
    }
  }
  
  // 删除项目
  static async deleteProject(projectId) {
    try {
      console.log('从 Cloudinary 删除项目:', projectId);
      
      const fileName = `project_${projectId}.json`;
      const publicId = `${STORAGE_FOLDER}/${fileName}`;
      
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'raw'
      });
      
      console.log('删除结果:', result);
      
      if (result.result === 'ok') {
        return { success: true };
      } else {
        return { success: false, error: result.result };
      }
      
    } catch (error) {
      console.error('从 Cloudinary 删除项目失败:', error);
      return { success: false, error: error.message };
    }
  }
  
  // 获取单个项目
  static async getProject(projectId) {
    try {
      const fileName = `project_${projectId}.json`;
      const publicId = `${STORAGE_FOLDER}/${fileName}`;
      
      // 获取文件的下载URL
      const fileUrl = cloudinary.url(publicId, {
        resource_type: 'raw',
        flags: 'attachment'
      });
      
      const response = await fetch(fileUrl);
      if (response.ok) {
        const projectData = await response.json();
        return { success: true, data: projectData };
      } else {
        return { success: false, error: '项目未找到' };
      }
      
    } catch (error) {
      console.error('获取项目失败:', error);
      return { success: false, error: error.message };
    }
  }
}
