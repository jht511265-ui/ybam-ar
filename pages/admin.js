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

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('文件为空'));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result;
        if (typeof base64 === 'string') {
          resolve(base64);
        } else {
          reject(new Error('文件读取失败'));
        }
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const uploadFilesToCloudinary = async (files) => {
    console.log('开始转换文件为base64...');
    
    const filesBase64 = {};
    const errors = [];

    try {
      // 逐个转换文件
      if (files.originalImage) {
        console.log('转换原始图像...');
        try {
          filesBase64.originalImage = await fileToBase64(files.originalImage);
          console.log('原始图像转换成功');
        } catch (error) {
          errors.push(`原始图像转换失败: ${error.message}`);
        }
      }

      if (files.arVideo) {
        console.log('转换AR视频...');
        try {
          filesBase64.arVideo = await fileToBase64(files.arVideo);
          console.log('AR视频转换成功');
        } catch (error) {
          errors.push(`AR视频转换失败: ${error.message}`);
        }
      }

      if (files.markerImage) {
        console.log('转换标记图像...');
        try {
          filesBase64.markerImage = await fileToBase64(files.markerImage);
          console.log('标记图像转换成功');
        } catch (error) {
          errors.push(`标记图像转换失败: ${error.message}`);
        }
      }

      if (errors.length > 0) {
        throw new Error(errors.join('; '));
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
        const errorData = await response.json();
        throw new Error(errorData.error || `上传失败: ${response.status}`);
      }

      const result = await response.json();
      console.log('上传结果:', result);
      
      return result;

    } catch (error) {
      console.error('文件上传过程错误:', error);
      throw error;
    }
  };

  // 修复创建项目函数 - 添加更详细的调试信息
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
      console.log('1. 验证通过，开始文件上传');
      
      let projectData = {
        name: formData.name.trim()
      };

      // 文件上传
      setMessage('正在准备文件上传...');
      
      console.log('2. 准备上传的文件到Cloudinary');
      
      const uploadResult = await uploadFilesToCloudinary({
        originalImage: formData.originalImage,
        arVideo: formData.arVideo,
        markerImage: formData.markerImage
      });

      console.log('3. 文件上传结果:', uploadResult);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || '文件上传失败');
      }

      // 构建项目数据
      projectData = {
        ...projectData,
        originalImage: uploadResult.data.originalImage,
        videoURL: uploadResult.data.videoURL,
        markerImage: uploadResult.data.markerImage || uploadResult.data.originalImage,
        cloudinaryData: {
          originalImagePublicId: uploadResult.data.originalImagePublicId,
          videoPublicId: uploadResult.data.videoPublicId,
          markerImagePublicId: uploadResult.data.markerImagePublicId
        }
      };

      console.log('4. 准备发送项目数据到API');
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

      console.log('5. API响应状态:', response.status);

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
      console.log('6. 项目创建成功:', responseData);

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

  // 修复文件上传组件
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

  // 添加测试函数 - 直接在控制台调用测试
  const testCreateProject = async () => {
    console.log('=== 测试创建项目 ===');
    if (!authToken) {
      console.log('❌ 没有认证token');
      return;
    }
    
    const testData = {
      name: '测试项目_' + Date.now(),
      originalImage: 'https://placehold.co/800x600/4e54c8/ffffff/png?text=测试图像',
      videoURL: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      markerImage: 'https://placehold.co/400x400/fdbb2d/000000/png?text=标记图像'
    };
    
    console.log('测试数据:', testData);
    
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(testData)
      });
      
      console.log('测试响应状态:', response.status);
      const result = await response.json();
      console.log('测试结果:', result);
    } catch (error) {
      console.error('测试失败:', error);
    }
  };

  return (
    <div className="container">
      <Head>
        <title>管理后台 - AR项目管理系统</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </Head>

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
          background: linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d);
          min-height: 100vh;
          color: #fff;
        }
        
        .admin-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .admin-header {
          background-color: rgba(0, 0, 0, 0.7);
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          margin-bottom: 2rem;
          border-radius: 10px;
        }
        
        .admin-header h1 {
          font-size: 1.8rem;
          background: linear-gradient(to right, #fdbb2d, #b21f1f);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 50px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .btn-primary {
          background-color: #4e54c8;
          color: white;
        }
        
        .btn-primary:hover {
          background-color: #3f43a1;
          transform: translateY(-2px);
        }
        
        .btn-danger {
          background-color: #dc3545;
          color: white;
        }
        
        .btn-danger:hover {
          background-color: #bd2130;
          transform: translateY(-2px);
        }
        
        .btn-success {
          background-color: #28a745;
          color: white;
        }
        
        .btn-success:hover {
          background-color: #218838;
          transform: translateY(-2px);
        }
        
        .btn:disabled {
          background-color: #6c757d;
          cursor: not-allowed;
          transform: none;
        }
        
        .admin-content {
          background-color: rgba(0, 0, 0, 0.7);
          border-radius: 20px;
          padding: 2rem;
        }
        
        .admin-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        
        .message {
          padding: 10px 15px;
          border-radius: 5px;
          margin-bottom: 15px;
          text-align: center;
          font-weight: 500;
        }
        
        .message.success {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        
        .message.error {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        
        .message.info {
          background-color: #d1ecf1;
          color: #0c5460;
          border: 1px solid #bee5eb;
        }
        
        .projects-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
        }
        
        .projects-table th,
        .projects-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .projects-table th {
          background-color: rgba(78, 84, 200, 0.3);
          color: #fdbb2d;
        }
        
        .action-buttons {
          display: flex;
          gap: 10px;
        }
        
        .modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.8);
          z-index: 1000;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .modal-content {
          background: linear-gradient(135deg, #1a2a6c, #3a3f7d);
          width: 90%;
          max-width: 600px;
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 5px 25px rgba(0, 0, 0, 0.5);
          max-height: 90vh;
          overflow-y: auto;
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .close-modal {
          font-size: 1.5rem;
          cursor: pointer;
          color: #fdbb2d;
          background: none;
          border: none;
          padding: 5px;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #fdbb2d;
          font-weight: 600;
        }
        
        .form-group input[type="text"] {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          border: 2px solid #4e54c8;
          background-color: rgba(0, 0, 0, 0.3);
          color: white;
        }
        
        .file-input-wrapper {
          position: relative;
          width: 100%;
        }
        
        .file-input {
          position: absolute;
          left: -9999px;
          opacity: 0;
        }
        
        .file-input-label {
          display: block;
          width: 100%;
          padding: 12px;
          border: 2px dashed #4e54c8;
          border-radius: 10px;
          background-color: rgba(0, 0, 0, 0.2);
          color: #fdbb2d;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .file-input-label:hover {
          background-color: rgba(78, 84, 200, 0.1);
          border-color: #fdbb2d;
        }
        
        .file-input:disabled + .file-input-label {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .file-preview {
          margin-top: 10px;
          text-align: center;
        }
        
        .file-preview img,
        .file-preview video {
          max-width: 100%;
          max-height: 200px;
          border-radius: 5px;
          border: 2px solid #4e54c8;
        }
        
        .upload-status {
          background-color: rgba(255, 255, 255, 0.1);
          padding: 10px;
          border-radius: 5px;
          margin: 10px 0;
          text-align: center;
          color: #fdbb2d;
        }
        
        .loading {
          text-align: center;
          padding: 2rem;
        }
        
        .storage-info {
          background: rgba(255, 255, 255, 0.1);
          padding: 1rem;
          border-radius: 10px;
          margin-bottom: 1rem;
        }
        
        .debug-panel {
          background: rgba(255, 0, 0, 0.1);
          padding: 1rem;
          border-radius: 10px;
          margin-top: 1rem;
          border: 1px solid red;
        }
        
        @media (max-width: 768px) {
          .admin-container {
            padding: 10px;
          }
          
          .admin-content {
            padding: 1rem;
          }
          
          .action-buttons {
            flex-direction: column;
          }
          
          .admin-panel-header {
            flex-direction: column;
            align-items: flex-start;
          }
        }
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

        {/* 调试面板 */}
        <div className="debug-panel">
          <h4>调试面板</h4>
          <p>当前状态: {isLoading ? '加载中' : uploading ? '上传中' : '就绪'}</p>
          <p>认证Token: {authToken ? '已设置' : '未设置'}</p>
          <button className="btn btn-secondary" onClick={testCreateProject}>
            <i className="fas fa-bug"></i> 测试创建项目
          </button>
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

          {isLoading ? (
            <div className="loading">
              <p><i className="fas fa-spinner fa-spin"></i> 加载中...</p>
            </div>
          ) : (
            <table className="projects-table">
              <thead>
                <tr>
                  <th>项目名称</th>
                  <th>原始图像</th>
                  <th>AR视频</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{textAlign: 'center', padding: '2rem'}}>
                      <img 
                        src={getDefaultImage('暂无数据', 120, 90)} 
                        alt="暂无数据" 
                        style={{marginBottom: '1rem', borderRadius: '10px'}}
                        onError={(e) => handleImageError(e, 'no-data')}
                      />
                      <p>暂无项目数据</p>
                      <p style={{fontSize: '0.9rem', opacity: 0.7}}>
                        请创建第一个项目或 
                        <button 
                          onClick={() => fetchProjects(authToken)} 
                          style={{background: 'none', border: 'none', color: '#fdbb2d', textDecoration: 'underline', cursor: 'pointer', margin: '0 5px'}}
                        >
                          点击刷新
                        </button>
                      </p>
                    </td>
                  </tr>
                ) : (
                  projects.map((project) => (
                    <tr key={project._id}>
                      <td>
                        <strong>{project.name}</strong>
                        <br />
                        <small style={{opacity: 0.7}}>ID: {project._id}</small>
                      </td>
                      <td>
                        {project.originalImage && (
                          <img 
                            src={project.originalImage} 
                            alt="原始图像" 
                            style={{width: '80px', height: '60px', objectFit: 'cover', borderRadius: '5px'}}
                            onError={(e) => handleImageError(e, 'thumbnail')}
                          />
                        )}
                      </td>
                      <td>
                        {project.videoURL && (
                          <div style={{position: 'relative'}}>
                            <video 
                              src={project.videoURL} 
                              style={{width: '80px', height: '60px', objectFit: 'cover', borderRadius: '5px'}}
                              muted
                              onError={handleVideoError}
                            />
                          </div>
                        )}
                      </td>
                      <td>
                        {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : '未知'}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn btn-danger"
                            onClick={() => handleDelete(project._id)}
                            disabled={isLoading}
                          >
                            <i className="fas fa-trash"></i> 删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
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
