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
      
      // 测试连接
      try {
        await cloudinary.api.ping();
        console.log('✅ Cloudinary 连接正常');
      } catch (error) {
        console.error('❌ Cloudinary 连接失败:', error.message);
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
            
            // 直接使用 Cloudinary API 获取文件内容
            const fileUrl = cloudinary.url(resource.public_id, {
              resource_type: 'raw',
              type: 'authenticated'
            });
            
            const response = await fetch(fileUrl);
            if (response.ok) {
              const projectData = await response.json();
              if (projectData && projectData._id) {
                console.log('✅ 加载项目成功:', projectData.name);
                projects.push(projectData);
              } else {
                console.warn('⚠️ 文件内容格式错误:', resource.public_id);
              }
            } else {
              console.warn('⚠️ 无法获取文件内容:', fileUrl, response.status);
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
      // 出错时返回模拟数据
      return this.getMockProjects();
    }
  }
  
  // 模拟项目数据（用于开发和测试）
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
        updatedAt: new Date().toISOString(),
        status: 'active'
      },
      {
        _id: 'mock_project_2',
        name: '示例项目 2',
        originalImage: 'https://via.placeholder.com/800x600/b21f1f/ffffff?text=示例图像2',
        videoURL: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        markerImage: 'https://via.placeholder.com/400x400/1a2a6c/ffffff?text=标记图像2',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
        status: 'active'
      }
    ];
  }
  
  // 保存单个项目
  static async saveProject(project) {
    try {
      console.log('💾 保存项目到 Cloudinary:', project._id);
      
      if (!project._id || !project.name) {
        throw new Error('项目数据不完整：缺少ID或名称');
      }
      
      // 检查 Cloudinary 配置
      const hasConfig = process.env.CLOUDINARY_CLOUD_NAME && 
                       process.env.CLOUDINARY_API_KEY && 
                       process.env.CLOUDINARY_API_SECRET;
      
      if (!hasConfig) {
        console.warn('⚠️ Cloudinary 配置缺失，模拟保存成功');
        return { 
          success: true, 
          publicId: `mock_${project._id}`,
          url: 'https://example.com/mock-file.json',
          message: '模拟保存成功（实际未保存到Cloudinary）'
        };
      }
      
      // 测试连接
      try {
        await cloudinary.api.ping();
        console.log('✅ Cloudinary 连接正常，开始上传');
      } catch (error) {
        console.error('❌ Cloudinary 连接失败:', error.message);
        throw new Error('Cloudinary 连接失败: ' + error.message);
      }
      
      // 准备项目数据
      const projectData = {
        ...project,
        // 确保有必要的字段
        updatedAt: new Date().toISOString(),
        cloudinaryStorage: true
      };
      
      const projectJson = JSON.stringify(projectData, null, 2);
      console.log('📦 项目数据大小:', projectJson.length, '字符');
      
      // 统一文件命名
      const fileName = `project_${project._id}.json`;
      const publicId = `${STORAGE_FOLDER}/${fileName}`;
      
      console.log('📤 上传文件到:', publicId);
      
      // 使用 Buffer 创建 base64 数据
      const base64Data = Buffer.from(projectJson).toString('base64');
      
      const result = await cloudinary.uploader.upload(
        `data:application/json;base64,${base64Data}`,
        {
          resource_type: 'raw',
          public_id: publicId,
          folder: STORAGE_FOLDER,
          overwrite: true,
          context: `project_id=${project._id}|name=${encodeURIComponent(project.name)}`,
          tags: ['ar-project', 'ybam']
        }
      );
      
      console.log('✅ 项目保存成功:', {
        publicId: result.public_id,
        size: result.bytes,
        url: result.secure_url
      });
      
      return { 
        success: true, 
        publicId: result.public_id,
        url: result.secure_url,
        size: result.bytes
      };
      
    } catch (error) {
      console.error('❌ 保存项目到 Cloudinary 失败:', error);
      
      // 提供更详细的错误信息
      let errorMessage = error.message;
      if (error.message.includes('Invalid credentials')) {
        errorMessage = 'Cloudinary 认证失败，请检查API密钥配置';
      } else if (error.message.includes('Network')) {
        errorMessage = '网络连接失败，请检查网络设置';
      }
      
      return { 
        success: false, 
        error: errorMessage,
        details: '请检查Cloudinary配置和网络连接',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }
  
  // 删除项目
  static async deleteProject(projectId) {
    try {
      console.log('🗑️ 从 Cloudinary 删除项目:', projectId);
      
      if (!projectId) {
        throw new Error('项目ID不能为空');
      }
      
      // 检查 Cloudinary 配置
      const hasConfig = process.env.CLOUDINARY_CLOUD_NAME && 
                       process.env.CLOUDINARY_API_KEY && 
                       process.env.CLOUDINARY_API_SECRET;
      
      if (!hasConfig) {
        console.warn('⚠️ Cloudinary 配置缺失，模拟删除成功');
        return { 
          success: true, 
          message: '模拟删除成功（实际未从Cloudinary删除）'
        };
      }
      
      // 测试连接
      try {
        await cloudinary.api.ping();
        console.log('✅ Cloudinary 连接正常，开始删除');
      } catch (error) {
        console.error('❌ Cloudinary 连接失败:', error.message);
        throw new Error('Cloudinary 连接失败: ' + error.message);
      }
      
      // 统一文件命名
      const fileName = `project_${projectId}.json`;
      const publicId = `${STORAGE_FOLDER}/${fileName}`;
      
      console.log('🔍 尝试删除文件:', publicId);
      
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'raw'
      });
      
      console.log('🗑️ 删除结果:', result);
      
      if (result.result === 'ok') {
        console.log('✅ 文件删除成功:', publicId);
        return { 
          success: true,
          message: '文件删除成功',
          publicId: publicId
        };
      } else {
        console.log('⚠️ 主要文件未找到，尝试兼容性删除...');
        
        // 尝试多种可能的文件名格式（兼容旧数据）
        const possibleNames = [
          `project_${projectId}`,   // 无后缀
          `${projectId}.json`,      // 无前缀
          `test_${projectId}.json`, // 兼容旧格式
          `test_${projectId}`       // 旧格式无后缀
        ];
        
        let deletedPublicId = null;
        
        for (const name of possibleNames) {
          const tryPublicId = `${STORAGE_FOLDER}/${name}`;
          console.log('🔄 尝试删除:', tryPublicId);
          
          try {
            const tryResult = await cloudinary.uploader.destroy(tryPublicId, {
              resource_type: 'raw'
            });
            
            if (tryResult.result === 'ok') {
              console.log('✅ 兼容文件删除成功:', tryPublicId);
              deletedPublicId = tryPublicId;
              break;
            } else {
              console.log('❌ 文件不存在:', tryPublicId);
            }
          } catch (error) {
            console.log('⚠️ 尝试删除失败:', tryPublicId, error.message);
            continue;
          }
        }
        
        if (deletedPublicId) {
          return { 
            success: true,
            message: '兼容文件删除成功',
            publicId: deletedPublicId
          };
        } else {
          console.log('❌ 所有删除尝试都失败，可能文件不存在');
          return { 
            success: false, 
            error: `文件删除失败，可能文件不存在。Cloudinary返回: ${result.result}`,
            suggestion: '请检查项目ID是否正确，或文件可能已被删除'
          };
        }
      }
      
    } catch (error) {
      console.error('❌ 从 Cloudinary 删除项目失败:', error);
      
      let errorMessage = error.message;
      if (error.message.includes('Invalid credentials')) {
        errorMessage = 'Cloudinary 认证失败，请检查API密钥配置';
      }
      
      return { 
        success: false, 
        error: `删除失败: ${errorMessage}`,
        details: '请检查Cloudinary配置和网络连接',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }
  
  // 获取单个项目
  static async getProject(projectId) {
    try {
      console.log('🔍 获取单个项目:', projectId);
      
      const projects = await this.getAllProjects();
      const project = projects.find(p => p._id === projectId);
      
      if (project) {
        console.log('✅ 找到项目:', project.name);
        return project;
      } else {
        console.log('❌ 项目未找到:', projectId);
        return null;
      }
      
    } catch (error) {
      console.error('❌ 获取单个项目失败:', error);
      return null;
    }
  }
  
  // 更新项目
  static async updateProject(projectId, updates) {
    try {
      console.log('✏️ 更新项目:', projectId);
      
      // 先获取现有项目
      const existingProject = await this.getProject(projectId);
      if (!existingProject) {
        throw new Error('项目不存在: ' + projectId);
      }
      
      // 合并更新
      const updatedProject = {
        ...existingProject,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      // 保存更新后的项目
      const saveResult = await this.saveProject(updatedProject);
      
      if (saveResult.success) {
        console.log('✅ 项目更新成功:', projectId);
        return {
          success: true,
          project: updatedProject,
          publicId: saveResult.publicId
        };
      } else {
        throw new Error('保存更新失败: ' + saveResult.error);
      }
      
    } catch (error) {
      console.error('❌ 更新项目失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // 检查 Cloudinary 连接状态
  static async checkConnection() {
    try {
      const hasConfig = process.env.CLOUDINARY_CLOUD_NAME && 
                       process.env.CLOUDINARY_API_KEY && 
                       process.env.CLOUDINARY_API_SECRET;
      
      if (!hasConfig) {
        return { 
          connected: false, 
          message: 'Cloudinary 配置缺失',
          config: {
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? '已设置' : '未设置',
            api_key: process.env.CLOUDINARY_API_KEY ? '已设置' : '未设置',
            api_secret: process.env.CLOUDINARY_API_SECRET ? '已设置' : '未设置'
          }
        };
      }
      
      // 测试连接
      await cloudinary.api.ping();
      
      // 检查文件夹是否存在
      try {
        const folders = await cloudinary.api.root_folders();
        const hasFolder = folders.folders.some(folder => folder.name === STORAGE_FOLDER);
        
        return { 
          connected: true, 
          message: 'Cloudinary 连接正常',
          folderExists: hasFolder,
          folderName: STORAGE_FOLDER
        };
        
      } catch (folderError) {
        return { 
          connected: true, 
          message: 'Cloudinary 连接正常（文件夹检查失败）',
          warning: folderError.message
        };
      }
      
    } catch (error) {
      return { 
        connected: false, 
        message: `Cloudinary 连接失败: ${error.message}`,
        error: error.message
      };
    }
  }
  
  // 清理无效文件（开发工具）
  static async cleanupOrphanedFiles() {
    try {
      console.log('🧹 清理孤儿文件...');
      
      const hasConfig = process.env.CLOUDINARY_CLOUD_NAME && 
                       process.env.CLOUDINARY_API_KEY && 
                       process.env.CLOUDINARY_API_SECRET;
      
      if (!hasConfig) {
        console.warn('⚠️ Cloudinary 配置缺失，跳过清理');
        return { success: true, message: '配置缺失，跳过清理' };
      }
      
      const result = await cloudinary.search
        .expression(`resource_type:raw AND folder:${STORAGE_FOLDER}`)
        .execute();
      
      console.log('📁 找到文件数量:', result.resources?.length || 0);
      
      const cleanupResults = {
        total: result.resources?.length || 0,
        deleted: 0,
        errors: 0,
        details: []
      };
      
      if (result.resources) {
        for (const resource of result.resources) {
          try {
            // 检查文件内容是否有效
            const fileUrl = cloudinary.url(resource.public_id, {
              resource_type: 'raw',
              type: 'authenticated'
            });
            
            const response = await fetch(fileUrl);
            if (response.ok) {
              const content = await response.text();
              try {
                JSON.parse(content);
                // 有效JSON，跳过
                cleanupResults.details.push({
                  publicId: resource.public_id,
                  status: 'valid',
                  action: 'skipped'
                });
              } catch (parseError) {
                // 无效JSON，删除
                console.log('🗑️ 删除无效文件:', resource.public_id);
                await cloudinary.uploader.destroy(resource.public_id, {
                  resource_type: 'raw'
                });
                cleanupResults.deleted++;
                cleanupResults.details.push({
                  publicId: resource.public_id,
                  status: 'invalid',
                  action: 'deleted'
                });
              }
            }
          } catch (error) {
            console.error('❌ 处理文件失败:', resource.public_id, error);
            cleanupResults.errors++;
            cleanupResults.details.push({
              publicId: resource.public_id,
              status: 'error',
              action: 'failed',
              error: error.message
            });
          }
        }
      }
      
      console.log('✅ 清理完成:', cleanupResults);
      return {
        success: true,
        ...cleanupResults
      };
      
    } catch (error) {
      console.error('❌ 清理失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// 导出默认实例
export default CloudinaryStorage;
