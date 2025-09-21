import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Admin() {
  const [projects, setProjects] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    originalImage: '',
    videoURL: '',
    markerImage: ''
  });
  const [editFormData, setEditFormData] = useState({
    id: '',
    name: '',
    originalImage: '',
    videoURL: '',
    markerImage: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [authToken, setAuthToken] = useState(null);
  const [message, setMessage] = useState('');
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
      const response = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      } else if (response.status === 401) {
        handleLogout();
      } else {
        setMessage('获取项目失败');
      }
    } catch (error) {
      console.error('获取项目失败:', error);
      setMessage('网络错误，请重试');
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

  const handleCreate = async (e) => {
    e.preventDefault();
    
    if (!authToken) return;
    if (!formData.name || !formData.originalImage || !formData.videoURL || !formData.markerImage) {
      setMessage('请填写所有字段');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowCreateModal(false);
        setFormData({ name: '', originalImage: '', videoURL: '', markerImage: '' });
        fetchProjects(authToken);
        setMessage('项目创建成功！');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage('创建失败: ' + error.message);
      }
    } catch (error) {
      console.error('创建项目失败:', error);
      setMessage('创建失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    if (!authToken) return;
    if (!editFormData.name) {
      setMessage('项目名称不能为空');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/projects', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(editFormData)
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditFormData({ id: '', name: '', originalImage: '', videoURL: '', markerImage: '' });
        fetchProjects(authToken);
        setMessage('项目更新成功！');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage('更新失败: ' + error.message);
      }
    } catch (error) {
      console.error('更新项目失败:', error);
      setMessage('更新失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这个项目吗？此操作不可恢复。') || !authToken) return;

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/projects', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ id })
      });

      if (response.ok) {
        fetchProjects(authToken);
        setMessage('项目删除成功！');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage('删除失败: ' + error.message);
      }
    } catch (error) {
      console.error('删除项目失败:', error);
      setMessage('删除失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (project) => {
    setEditFormData({
      id: project._id,
      name: project.name,
      originalImage: project.originalImage || '',
      videoURL: project.videoURL || '',
      markerImage: project.markerImage || ''
    });
    setShowEditModal(true);
    setMessage('');
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setFormData({ name: '', originalImage: '', videoURL: '', markerImage: '' });
    setEditFormData({ id: '', name: '', originalImage: '', videoURL: '', markerImage: '' });
    setMessage('');
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
        }
        
        .btn-primary {
          background-color: #4e54c8;
          color: white;
        }
        
        .btn-primary:hover {
          background-color: #3f43a1;
          transform: translateY(-2px);
        }
        
        .btn-secondary {
          background-color: transparent;
          border: 2px solid #4e54c8;
          color: #4e54c8;
        }
        
        .btn-secondary:hover {
          background-color: rgba(78, 84, 200, 0.1);
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
        
        .projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        
        .project-card {
          background: linear-gradient(135deg, #3a3f7d, #1a2a6c);
          border-radius: 15px;
          padding: 20px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
          transition: transform 0.3s ease;
        }
        
        .project-card:hover {
          transform: translateY(-5px);
        }
        
        .project-card h3 {
          margin-bottom: 10px;
          color: #fdbb2d;
        }
        
        .project-image {
          width: 100%;
          height: 180px;
          background-color: #2c2c2c;
          border-radius: 10px;
          margin: 10px 0;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 3rem;
          color: #4e54c8;
          overflow: hidden;
        }
        
        .project-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .project-info {
          margin: 10px 0;
        }
        
        .project-info p {
          margin: 5px 0;
          font-size: 0.9rem;
          color: #e1e1e1;
        }
        
        .project-actions {
          display: flex;
          justify-content: space-between;
          margin-top: 15px;
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
          padding: 0;
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
        
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          border: 2px solid #4e54c8;
          background-color: rgba(0, 0, 0, 0.3);
          color: white;
          font-size: 1rem;
        }
        
        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #fdbb2d;
        }
        
        .preview-container {
          width: 100%;
          height: 200px;
          background-color: rgba(0, 0, 0, 0.3);
          border-radius: 10px;
          margin: 15px 0;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
        }
        
        .preview-container img,
        .preview-container video {
          max-width: 100%;
          max-height: 100%;
        }
        
        .generate-options {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
          gap: 10px;
        }
        
        .help-section {
          background: rgba(255, 255, 255, 0.1);
          padding: 15px;
          border-radius: 10px;
          margin-bottom: 20px;
        }
        
        .help-section h4 {
          color: #fdbb2d;
          margin-bottom: 10px;
        }
        
        .help-section ul {
          margin-left: 20px;
        }
        
        .help-section li {
          margin-bottom: 5px;
        }
        
        .help-section a {
          color: #4e54c8;
          text-decoration: underline;
        }
        
        .help-section a:hover {
          color: #fdbb2d;
        }
        
        .loading {
          text-align: center;
          padding: 2rem;
          font-size: 1.2rem;
        }
        
        .empty-state {
          text-align: center;
          padding: 3rem;
          color: #e1e1e1;
        }
        
        .empty-state i {
          font-size: 4rem;
          color: #4e54c8;
          margin-bottom: 1rem;
        }
        
        @media (max-width: 768px) {
          .projects-grid {
            grid-template-columns: 1fr;
          }
          
          .admin-panel-header {
            flex-direction: column;
            gap: 15px;
          }
          
          .generate-options {
            flex-direction: column;
          }
          
          .project-actions {
            flex-direction: column;
          }
          
          .admin-header {
            flex-direction: column;
            gap: 15px;
            text-align: center;
          }
        }
      `}</style>

      <div className="admin-container">
        <div className="admin-header">
          <h1><i className="fas fa-cube"></i> AR项目管理后台</h1>
          <div>
            <button className="btn btn-success" onClick={() => setShowCreateModal(true)} style={{ marginRight: '10px' }}>
              <i className="fas fa-plus"></i> 创建项目
            </button>
            <button className="btn btn-danger" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> 退出登录
            </button>
          </div>
        </div>

        <div className="admin-content">
          <div className="help-section">
            <h4>📝 使用说明：</h4>
            <p>请使用外部URL来添加图片和视频：</p>
            <ul>
              <li>图片上传推荐：<a href="https://imgbb.com/" target="_blank" rel="noopener noreferrer">ImgBB</a></li>
              <li>视频上传推荐：<a href="https://streamable.com/" target="_blank" rel="noopener noreferrer">Streamable</a></li>
              <li>上传后获取直接链接URL填入下方表单</li>
              <li>标记图像应该是高对比度的图片，便于AR识别</li>
            </ul>
          </div>

          {message && (
            <div className={`message ${message.includes('成功') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          <div className="admin-panel-header">
            <h2>📁 项目管理</h2>
            <span>共 {projects.length} 个项目</span>
          </div>
          
          {isLoading ? (
            <div className="loading">
              <i className="fas fa-spinner fa-spin"></i> 加载中...
            </div>
          ) : (
            <div className="projects-grid">
              {projects.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-folder-open"></i>
                  <h3>暂无项目</h3>
                  <p>点击"创建项目"按钮开始添加AR内容</p>
                  <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    <i className="fas fa-plus"></i> 创建第一个项目
                  </button>
                </div>
              ) : (
                projects.map(project => (
                  <div key={project._id} className="project-card">
                    <h3>{project.name}</h3>
                    
                    <div className="project-image">
                      {project.originalImage ? (
                        <img src={project.originalImage} alt={project.name} />
                      ) : (
                        <i className="fas fa-image"></i>
                      )}
                    </div>
                    
                    <div className="project-info">
                      <p><strong>创建时间:</strong> {new Date(project.createdAt).toLocaleDateString('zh-CN')}</p>
                      <p><strong>状态:</strong> <span style={{ color: project.status === '已发布' ? '#00ff66' : '#ffcc00' }}>
                        {project.status || '已发布'}
                      </span></p>
                      <p><strong>标记图像:</strong> {project.markerImage ? '✅ 已设置' : '❌ 未设置'}</p>
                      <p><strong>视频:</strong> {project.videoURL ? '✅ 已设置' : '❌ 未设置'}</p>
                    </div>
                    
                    <div className="project-actions">
                      <button className="btn btn-secondary" onClick={() => openEditModal(project)}>
                        <i className="fas fa-edit"></i> 编辑
                      </button>
                      <button className="btn btn-danger" onClick={() => handleDelete(project._id)}>
                        <i className="fas fa-trash"></i> 删除
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 创建项目模态框 */}
          {showCreateModal && (
            <div className="modal">
              <div className="modal-content">
                <div className="modal-header">
                  <h2>➕ 创建新项目</h2>
                  <button className="close-modal" onClick={closeModals}>&times;</button>
                </div>
                <form onSubmit={handleCreate}>
                  <div className="form-group">
                    <label htmlFor="projectName">项目名称 *</label>
                    <input
                      type="text"
                      id="projectName"
                      placeholder="输入项目名称"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="originalImage">原始图片URL *</label>
                    <input
                      type="url"
                      id="originalImage"
                      placeholder="https://example.com/image.jpg"
                      value={formData.originalImage}
                      onChange={(e) => setFormData({...formData, originalImage: e.target.value})}
                      required
                    />
                    {formData.originalImage && (
                      <div className="preview-container">
                        <img src={formData.originalImage} alt="预览" onError={(e) => e.target.style.display = 'none'} />
                      </div>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="markerImage">标记图片URL (用于AR识别) *</label>
                    <input
                      type="url"
                      id="markerImage"
                      placeholder="https://example.com/marker-image.jpg"
                      value={formData.markerImage}
                      onChange={(e) => setFormData({...formData, markerImage: e.target.value})}
                      required
                    />
                    {formData.markerImage && (
                      <div className="preview-container">
                        <img src={formData.markerImage} alt="标记预览" onError={(e) => e.target.style.display = 'none'} />
                      </div>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="videoURL">视频URL *</label>
                    <input
                      type="url"
                      id="videoURL"
                      placeholder="https://example.com/video.mp4"
                      value={formData.videoURL}
                      onChange={(e) => setFormData({...formData, videoURL: e.target.value})}
                      required
                    />
                    {formData.videoURL && (
                      <div className="preview-container">
                        <video src={formData.videoURL} controls onError={(e) => e.target.style.display = 'none'} />
                      </div>
                    )}
                  </div>
                  
                  <div className="generate-options">
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={closeModals}
                    >
                      <i className="fas fa-times"></i> 取消
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={isLoading}
                    >
                      <i className="fas fa-save"></i> 
                      {isLoading ? '创建中...' : '创建项目'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 编辑项目模态框 */}
          {showEditModal && (
            <div className="modal">
              <div className="modal-content">
                <div className="modal-header">
                  <h2>✏️ 编辑项目</h2>
                  <button className="close-modal" onClick={closeModals}>&times;</button>
                </div>
                <form onSubmit={handleUpdate}>
                  <input type="hidden" value={editFormData.id} />
                  
                  <div className="form-group">
                    <label htmlFor="editProjectName">项目名称 *</label>
                    <input
                      type="text"
                      id="editProjectName"
                      placeholder="输入项目名称"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="editOriginalImage">原始图片URL</label>
                    <input
                      type="url"
                      id="editOriginalImage"
                      placeholder="https://example.com/image.jpg"
                      value={editFormData.originalImage}
                      onChange={(e) => setEditFormData({...editFormData, originalImage: e.target.value})}
                    />
                    {editFormData.originalImage && (
                      <div className="preview-container">
                        <img src={editFormData.originalImage} alt="预览" onError={(e) => e.target.style.display = 'none'} />
                      </div>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="editMarkerImage">标记图片URL</label>
                    <input
                      type="url"
                      id="editMarkerImage"
                      placeholder="https://example.com/marker-image.jpg"
                      value={editFormData.markerImage}
                      onChange={(e) => setEditFormData({...editFormData, markerImage: e.target.value})}
                    />
                    {editFormData.markerImage && (
                      <div className="preview-container">
                        <img src={editFormData.markerImage} alt="标记预览" onError={(e) => e.target.style.display = 'none'} />
                      </div>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="editVideoURL">视频URL</label>
                    <input
                      type="url"
                      id="editVideoURL"
                      placeholder="https://example.com/video.mp4"
                      value={editFormData.videoURL}
                      onChange={(e) => setEditFormData({...editFormData, videoURL: e.target.value})}
                    />
                    {editFormData.videoURL && (
                      <div className="preview-container">
                        <video src={editFormData.videoURL} controls onError={(e) => e.target.style.display = 'none'} />
                      </div>
                    )}
                  </div>
                  
                  <div className="generate-options">
                    <button 
                      type="button" 
                      className="btn btn-danger" 
                      onClick={() => handleDelete(editFormData.id)}
                      disabled={isLoading}
                    >
                      <i className="fas fa-trash"></i> 删除项目
                    </button>
                    <div>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={closeModals}
                        style={{ marginRight: '10px' }}
                      >
                        <i className="fas fa-times"></i> 取消
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={isLoading}
                      >
                        <i className="fas fa-save"></i> 
                        {isLoading ? '更新中...' : '更新项目'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
