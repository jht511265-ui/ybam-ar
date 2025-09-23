// lib/cloudinary-storage.js
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const STORAGE_FOLDER = 'ar-projects-data';

export class CloudinaryStorage {
  // 获取所有项目
  static async getAllProjects() {
    try {
      console.log('从 Cloudinary 获取项目数据...');
      
      const result = await cloudinary.search
        .expression(`resource_type:raw AND folder:${STORAGE_FOLDER}`)
        .sort_by('created_at', 'desc')
        .execute();
      
      console.log('找到文件数量:', result.resources?.length || 0);
      
      const projects = [];
      
      if (result.resources && result.resources.length > 0) {
        for (const resource of result.resources) {
          try {
            const response = await fetch(resource.secure_url);
            if (response.ok) {
              const projectData = await response.json();
              if (projectData && projectData._id) {
                projects.push(projectData);
              }
            }
          } catch (error) {
            console.error('获取文件内容失败:', resource.public_id, error);
          }
        }
      }
      
      console.log('成功加载项目数量:', projects.length);
      return projects;
      
    } catch (error) {
      console.error('从 Cloudinary 获取项目失败:', error);
      return [];
    }
  }
  
  // 保存单个项目 - 统一文件命名
  static async saveProject(project) {
    try {
      console.log('保存项目到 Cloudinary:', project._id);
      
      if (!project._id || !project.name) {
        throw new Error('项目数据不完整');
      }
      
      const projectJson = JSON.stringify(project, null, 2);
      
      // 统一使用 project_ 前缀
      const fileName = `project_${project._id}.json`;
      const publicId = `${STORAGE_FOLDER}/${fileName}`;
      
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
  
  // 删除项目 - 统一文件命名
  static async deleteProject(projectId) {
    try {
      console.log('从 Cloudinary 删除项目:', projectId);
      
      // 统一使用 project_ 前缀
      const fileName = `project_${projectId}.json`;
      const publicId = `${STORAGE_FOLDER}/${fileName}`;
      
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'raw'
      });
      
      console.log('删除结果:', result);
      
      if (result.result === 'ok') {
        return { success: true };
      } else {
        // 如果 project_ 前缀找不到，尝试 test_ 前缀（兼容旧数据）
        const oldFileName = `test_${projectId}.json`;
        const oldPublicId = `${STORAGE_FOLDER}/${oldFileName}`;
        
        const oldResult = await cloudinary.uploader.destroy(oldPublicId, {
          resource_type: 'raw'
        });
        
        console.log('尝试删除旧文件名结果:', oldResult);
        
        if (oldResult.result === 'ok') {
          return { success: true };
        }
        
        return { success: false, error: result.result };
      }
      
    } catch (error) {
      console.error('从 Cloudinary 删除项目失败:', error);
      return { success: false, error: error.message };
    }
  }
}
