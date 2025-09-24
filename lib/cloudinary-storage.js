// lib/cloudinary-storage.js
import { v2 as cloudinary } from 'cloudinary';

// 配置 Cloudinary
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
      console.log('🔍 从 Cloudinary 获取项目数据...');
      
      // 检查 Cloudinary 配置
      const hasConfig = process.env.CLOUDINARY_CLOUD_NAME && 
                       process.env.CLOUDINARY_API_KEY && 
                       process.env.CLOUDINARY_API_SECRET;
      
      if (!hasConfig) {
        console.warn('⚠️ Cloudinary 配置缺失，返回模拟数据');
        return this.getMockProjects();
      }
      
      const result = await cloudinary.search
        .expression(`resource_type:raw AND folder:${STORAGE_FOLDER}`)
        .sort_by('created_at', 'desc')
        .max_results(100)
        .execute();
      
      console.log('📁 找到文件数量:', result.resources?.length || 0);
      
      const projects = [];
      
      if (result.resources && result.resources.length > 0) {
        for (const resource of result.resources) {
          try {
            console.log('📄 处理文件:', resource.public_id);
            const response = await fetch(resource.secure_url);
            if (response.ok) {
              const projectData = await response.json();
              if (projectData && projectData._id) {
                console.log('✅ 加载项目成功:', projectData.name);
                projects.push(projectData);
              } else {
                console.warn('⚠️ 文件内容格式错误:', resource.public_id);
              }
            } else {
              console.warn('⚠️ 无法获取文件内容:', resource.secure_url, response.status);
            }
          } catch (error) {
            console.error('❌ 获取文件内容失败:', resource.public_id, error);
          }
        }
      }
      
      console.log('✅ 成功加载项目数量:', projects.length);
      return projects;
      
    } catch (error) {
      console.error('❌ 从 Cloudinary 获取项目失败:', error);
      return this.getMockProjects();
    }
  }
  
  // 模拟项目数据
  static getMockProjects() {
    console.log('🔄 使用模拟项目数据');
    return [
      {
        _id: 'mock_project_1',
        name: '示例项目 1',
        originalImage: 'https://via.placeholder.com/800x600/4e54c8/ffffff?text=示例图像1',
        videoURL: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        markerImage: 'https://via.placeholder.com/400x400/fdbb2d/000000?text=标记图像1',
        createdAt: new Date().toISOString(),
        status: 'active'
      }
    ];
  }
  
  // 保存项目
  static async saveProject(project) {
    try {
      console.log('💾 保存项目到 Cloudinary:', project._id);
      
      const hasConfig = process.env.CLOUDINARY_CLOUD_NAME && 
                       process.env.CLOUDINARY_API_KEY && 
                       process.env.CLOUDINARY_API_SECRET;
      
      if (!hasConfig) {
        console.warn('⚠️ Cloudinary 配置缺失，模拟保存成功');
        return { 
          success: true, 
          publicId: `mock_${project._id}`,
          message: '模拟保存成功'
        };
      }
      
      const projectJson = JSON.stringify(project, null, 2);
      const fileName = `project_${project._id}.json`;
      const publicId = `${STORAGE_FOLDER}/${fileName}`;
      
      console.log('📤 上传文件到:', publicId);
      
      const result = await cloudinary.uploader.upload(
        `data:application/json;base64,${Buffer.from(projectJson).toString('base64')}`,
        {
          resource_type: 'raw',
          public_id: publicId,
          folder: STORAGE_FOLDER,
          overwrite: true,
        }
      );
      
      console.log('✅ 项目保存成功:', result.public_id);
      return { 
        success: true, 
        publicId: result.public_id,
        url: result.secure_url
      };
      
    } catch (error) {
      console.error('❌ 保存项目失败:', error);
      return { 
        success: false, 
        error: error.message
      };
    }
  }
  
  // 删除项目
  static async deleteProject(projectId) {
    try {
      console.log('🗑️ 删除项目:', projectId);
      
      const hasConfig = process.env.CLOUDINARY_CLOUD_NAME && 
                       process.env.CLOUDINARY_API_KEY && 
                       process.env.CLOUDINARY_API_SECRET;
      
      if (!hasConfig) {
        console.warn('⚠️ Cloudinary 配置缺失，模拟删除成功');
        return { 
          success: true, 
          message: '模拟删除成功'
        };
      }
      
      const fileName = `project_${projectId}.json`;
      const publicId = `${STORAGE_FOLDER}/${fileName}`;
      
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'raw'
      });
      
      if (result.result === 'ok') {
        console.log('✅ 文件删除成功');
        return { success: true };
      } else {
        console.log('❌ 文件未找到，尝试其他格式...');
        
        // 尝试其他可能的文件名格式
        const possibleNames = [
          `test_${projectId}.json`,
          `${projectId}.json`,
          `project_${projectId}`
        ];
        
        for (const name of possibleNames) {
          const tryPublicId = `${STORAGE_FOLDER}/${name}`;
          try {
            const tryResult = await cloudinary.uploader.destroy(tryPublicId, {
              resource_type: 'raw'
            });
            if (tryResult.result === 'ok') {
              console.log('✅ 兼容文件删除成功:', tryPublicId);
              return { success: true };
            }
          } catch (error) {
            continue;
          }
        }
        
        return { 
          success: false, 
          error: '文件删除失败，可能文件不存在'
        };
      }
      
    } catch (error) {
      console.error('❌ 删除项目失败:', error);
      return { 
        success: false, 
        error: error.message
      };
    }
  }
}
