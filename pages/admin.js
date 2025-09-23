import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

// 工具函数
const getDefaultImage = (text = '图片', width = 80, height = 60) => {
  return `https://placehold.co/${width}x${height}/4e54c8/ffffff/png?text=${encodeURIComponent(text)}`;
};

const getDefaultVideo = () => {
  return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
};

export default function Admin() {
  const [projects, setProjects] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    originalImage: null,
    arVideo: null,
    markerImage: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [message, setMessage] = useState('');
  const [previewUrls, setPreviewUrls] = useState({
    originalImage: '',
    arVideo: '',
    markerImage: ''
  });
  const [fileNames, setFileNames] = useState({
    originalImage: '',
    arVideo: '',
    markerImage: ''
  });
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    setAuthToken(token);
    
    if (!token) {
      router.push('/');
      return;
    }
    
    fetchProjects(token);
  }, [router]);

  const fetchProjects = async (token) => {
    try {
      setIsLoading(true);
      setMessage('正在从 Cloudinary 加载项目...');
      
      console.log('开始获取项目列表');
      
      const response = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('获取项目响应状态:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('获取到的项目数据:', data);
        
        const projectsArray = Array.isArray(data) ? data : [];
        setProjects(projectsArray);
        setMessage(`成功加载 ${projectsArray.length} 个项目`);
        setTimeout(() => setMessage(''), 3000);
      } else if (response.status === 401) {
        handleLogout();
      } else {
        const errorText = await response.text();
        setMessage(`获取项目失败: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('获取项目失败:', error);
      setMessage('网络错误，请重试: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
    router.push('/');
  };

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      // 文件大小验证
      const maxSize = fieldName === 'arVideo' ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        setMessage(`❌ 文件大小超过限制: ${(file.size / 1024 / 1024).toFixed(2)}MB > ${(maxSize / 1024 / 1024).toFixed(2)}MB`);
        return;
      }

      // 文件类型验证
      if (fieldName === 'arVideo' && !file.type.startsWith('video/')) {
        setMessage('❌ 请上传视频文件');
        return;
      }
      if ((fieldName === 'originalImage' || fieldName === 'markerImage') && !file.type.startsWith('image/')) {
        setMessage('❌ 请上传图片文件');
        return;
      }

      setFormData(prev => ({
        ...prev,
        [fieldName]: file
      }));

      setFileNames(prev => ({
        ...prev,
        [fieldName]: file.name
      }));

      // 创建预览URL
      const previewUrl = URL.createObjectURL(file);
      setPreviewUrls(prev => ({
        ...prev,
        [fieldName]: previewUrl
      }));

      console.log(`文件选择: ${fieldName} - ${file.name} - ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      setMessage(`✅ ${fieldName === 'arVideo' ? '视频' : '图片'}文件已选择`);
    }
  };

  // 修复文件转base64函数
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('文件为空'));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        // 只取base64部分，去掉data:image/jpeg;base64,前缀
        const result = reader.result;
        if (typeof result === 'string') {
          // 如果是base64数据URL，提取纯base64部分
          const base64 = result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('文件读取失败'));
        }
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // 修复文件上传函数
  const uploadFilesToCloudinary = async (files) => {
    console.log('开始转换文件为base64...');
    
    const filesBase64 = {};

    try {
      // 逐个转换文件
      if (files.originalImage) {
        console.log('转换原始图像...');
        filesBase64.originalImage = await fileToBase64(files.originalImage);
        console.log('原始图像转换成功，大小:', filesBase64.originalImage.length);
      }

      if (files.arVideo) {
        console.log('转换AR视频...');
        filesBase64.arVideo = await fileToBase64(files.arVideo);
        console.log('AR视频转换成功，大小:', filesBase64.arVideo.length);
      }

      if (files.markerImage) {
        console.log('转换标记图像...');
        filesBase64.markerImage = await fileToBase64(files.markerImage);
        console.log('标记图像转换成功');
      }

      console.log('准备上传文件到 Cloudinary:', Object.keys(filesBase64));

      const response = await fetch('/api/upload-base64', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: filesBase64 }),
      });

      console.log('上传响应状态:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('上传失败响应:', errorText);
        throw new Error(`上传失败: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('上传结果:', result);
      
      return result;

    } catch (error) {
      console.error('文件上传过程错误:', error);
      throw new Error(`文件处理失败: ${error.message}`);
    }
  };

  // 修复创建项目函数
  const handleCreate = async (e) => {
    e.preventDefault();
    
    console.log('=== 开始创建项目 ===');
    console.log('表单数据:', {
      名称: formData.name,
      图像: formData.originalImage?.name,
      视频: formData.arVideo?.name,
      标记: formData.markerImage?.name
    });
    
    if (!authToken) {
      console.log('❌ 没有认证token');
      setMessage('请先登录');
      return;
    }

    // 增强验证
    if (!formData.name?.trim()) {
      console.log('❌ 项目名称为空');
      setMessage('请填写项目名称');
      return;
    }

    if (!formData.originalImage) {
      console.log('❌ 原始图像为空');
      setMessage('请上传原始图像');
      return;
    }

    if (!formData.arVideo) {
      console.log('❌ AR视频为空');
      setMessage('请上传AR视频');
      return;
    }

    console.log('✅ 所有验证通过，开始创建流程');

    setIsLoading(true);
    setUploading(true);
    setMessage('开始创建项目...');

    try {
      console.log('1. 开始文件上传到Cloudinary');
      
      setMessage('正在上传文件到Cloudinary...');
      
      const uploadResult = await uploadFilesToCloudinary({
        originalImage: formData.originalImage,
        arVideo: formData.arVideo,
        markerImage: formData.markerImage
      });

      console.log('2. 文件上传结果:', uploadResult);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || '文件上传失败');
      }

      // 构建项目数据
      const projectData = {
        name: formData.name.trim(),
        originalImage: uploadResult.data.originalImage,
        videoURL: uploadResult.data.videoURL,
        markerImage: uploadResult.data.markerImage || uploadResult.data.originalImage,
        cloudinaryData: {
          originalImagePublicId: uploadResult.data.originalImagePublicId,
          videoPublicId: uploadResult.data.videoPublicId,
          markerImagePublicId: uploadResult.data.markerImagePublicId
        }
      };

      console.log('3. 准备发送项目数据到API:', projectData);
      setMessage('正在保存项目信息...');

      // 发送创建项目请求
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(projectData)
      });

      console.log('4. API响应状态:', response.status);

      if (!response.ok) {
        let errorText = '未知错误';
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = `HTTP ${response.status}`;
        }
        console.error('API错误详情:', errorText);
        throw new Error(`创建项目失败: ${errorText}`);
      }

      const responseData = await response.json();
      console.log('5. 项目创建成功:', responseData);

      // 成功处理
      setShowCreateModal(false);
      setFormData({ name: '', originalImage: null, arVideo: null, markerImage: null });
      setPreviewUrls({ originalImage: '', arVideo: '', markerImage: '' });
      setFileNames({ originalImage: '', arVideo: '', markerImage: '' });
      
      setMessage('✅ 项目创建成功！');
      
      // 刷新项目列表
      setTimeout(() => {
        setMessage('');
        fetchProjects(authToken);
      }, 2000);
      
    } catch (error) {
      console.error('❌ 创建项目失败:', error);
      setMessage(`❌ 创建失败: ${error.message}`);
      
      // 显示详细错误信息
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setIsLoading(false);
      setUploading(false);
    }
  };

  // ... 其余代码保持不变（handleDelete, closeModal, 组件等）

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这个项目吗？此操作不可恢复。') || !authToken) return;

    setIsLoading(true);
    setMessage('正在删除项目...');

    try {
      const response = await fetch('/api/projects', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ id })
      });

      console.log('删除响应状态:', response.status);

      if (response.ok) {
        setMessage('项目删除成功！正在刷新列表...');
        await fetchProjects(authToken);
        setMessage('✅ 项目删除成功！');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage('删除失败: ' + error.message);
      }
    } catch (error) {
      console.error('删除项目失败:', error);
      setMessage('删除失败，请重试: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setFormData({ name: '', originalImage: null, arVideo: null, markerImage: null });
    setPreviewUrls({ originalImage: '', arVideo: '', markerImage: '' });
    setFileNames({ originalImage: '', arVideo: '', markerImage: '' });
    setMessage('');
  };

  // 修复图片错误处理
  const handleImageError = (e, type = 'default') => {
    console.log(`图片加载失败，使用默认图片: ${type}`);
    const defaultImages = {
      placeholder: getDefaultImage('加载失败', 200, 150),
      thumbnail: getDefaultImage('缩略图', 80, 60),
      'no-data': getDefaultImage('暂无数据', 120, 90),
      default: getDefaultImage('图片', 80, 60)
    };
    e.target.src = defaultImages[type] || defaultImages.default;
    e.target.onerror = null;
  };

  const handleVideoError = (e) => {
    console.log('视频加载失败');
    e.target.style.display = 'none';
    e.target.onerror = null;
  };

  // 文件上传组件
  const FileUploadField = ({ label, fieldName, accept, required = false }) => (
    <div className="form-group">
      <label htmlFor={`${fieldName}-input`}>
        {label} {required && <span style={{color: 'red'}}>*</span>}
      </label>
      <div className="file-input-wrapper">
        <input
          type="file"
          id={`${fieldName}-input`}
          name={fieldName}
          accept={accept}
          onChange={(e) => handleFileChange(e, fieldName)}
          required={required}
          disabled={uploading}
          className="file-input"
        />
        <label htmlFor={`${fieldName}-input`} className="file-input-label">
          <i className="fas fa-cloud-upload-alt"></i>
          {fileNames[fieldName] ? fileNames[fieldName] : '选择文件'}
        </label>
      </div>
      {previewUrls[fieldName] && (
        <div className="file-preview">
          {fieldName === 'arVideo' ? (
            <video 
              src={previewUrls[fieldName]} 
              controls 
              style={{ maxWidth: '200px', marginTop: '10px' }} 
              onError={handleVideoError}
            />
          ) : (
            <img 
              src={previewUrls[fieldName]} 
              alt="预览" 
              style={{ maxWidth: '200px', marginTop: '10px' }}
              onError={(e) => handleImageError(e, 'placeholder')}
            />
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="container">
      <Head>
        <title>管理后台 - AR项目管理系统</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </Head>

      {/* 样式部分保持不变 */}
      <style jsx global>{`
        /* ... 样式代码保持不变 ... */
      `}</style>

      <div className="admin-container">
        <div className="admin-header">
          <h1><i className="fas fa-cogs"></i> AR项目管理后台</h1>
          <button className="btn btn-danger" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> 退出登录
          </button>
        </div>

        <div className="storage-info">
          <h3><i className="fas fa-cloud"></i> Cloudinary 存储系统</h3>
          <p>项目数据安全存储在 Cloudinary 云存储中，支持持久化和高可用性。</p>
        </div>

        <div className="admin-content">
          <div className="admin-panel-header">
            <h2>项目管理</h2>
            <button 
              className="btn btn-primary" 
              onClick={() => setShowCreateModal(true)}
              disabled={isLoading}
            >
              <i className="fas fa-plus"></i> 创建新项目
            </button>
          </div>

          {message && (
            <div className={`message ${
              message.includes('成功') || message.includes('✅') ? 'success' : 
              message.includes('失败') || message.includes('❌') ? 'error' : 'info'
            }`}>
              {message}
            </div>
          )}

          {/* ... 其余JSX代码保持不变 ... */}
        </div>

        {/* 创建项目模态框 */}
        {showCreateModal && (
          <div className="modal">
            <div className="modal-content">
              <div className="modal-header">
                <h2>创建新项目</h2>
                <button className="close-modal" onClick={closeModal}>&times;</button>
              </div>
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label htmlFor="project-name-input">
                    项目名称 <span style={{color: 'red'}}>*</span>
                  </label>
                  <input
                    type="text"
                    id="project-name-input"
                    name="projectName"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="输入项目名称"
                    required
                    disabled={uploading}
                    autoComplete="off"
                  />
                </div>

                <FileUploadField 
                  label="原始图像 (必填，建议800x600)" 
                  fieldName="originalImage" 
                  accept="image/*"
                  required={true}
                />

                <FileUploadField 
                  label="AR视频 (必填，支持MP4等格式)" 
                  fieldName="arVideo" 
                  accept="video/*"
                  required={true}
                />

                <FileUploadField 
                  label="标记图像 (可选，如不上传将使用原始图像)" 
                  fieldName="markerImage" 
                  accept="image/*"
                />

                {uploading && (
                  <div className="upload-status">
                    <i className="fas fa-spinner fa-spin"></i> 文件上传中，请稍候...
                    <p style={{fontSize: '0.8rem', marginTop: '5px'}}>文件将上传到 Cloudinary 存储</p>
                  </div>
                )}

                <button 
                  type="submit" 
                  className="btn btn-success" 
                  style={{width: '100%', marginTop: '20px'}}
                  disabled={isLoading || uploading}
                  id="create-project-button"
                >
                  <i className="fas fa-save"></i> 
                  {uploading ? '上传中...' : isLoading ? '创建中...' : '创建项目'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
