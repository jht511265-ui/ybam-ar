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
          max-width: 500px;
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 5px 25px rgba(0, 0, 0, 0.5);
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
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #fdbb2d;
        }
        
        .form-group input {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          border: 2px solid #4e54c8;
          background-color: rgba(0, 0, 0, 0.3);
          color: white;
        }
        
        .loading {
          text-align: center;
          padding: 2rem;
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
          
          .projects-table {
            font-size: 0.8rem;
          }
          
          .projects-table th,
          .projects-table td {
            padding: 8px;
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

        <div className="admin-content">
          <div className="admin-panel-header">
            <h2>项目管理</h2>
            <button 
              className="btn btn-primary" 
              onClick={() => setShowCreateModal(true)}
            >
              <i className="fas fa-plus"></i> 创建新项目
            </button>
          </div>

          {message && (
            <div className={`message ${message.includes('成功') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          {isLoading ? (
            <div className="loading">
              <p>加载中...</p>
            </div>
          ) : (
            <table className="projects-table">
              <thead>
                <tr>
                  <th>项目名称</th>
                  <th>原始图像</th>
                  <th>AR视频</th>
                  <th>标记图像</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project._id}>
                    <td>{project.name}</td>
                    <td>
                      {project.originalImage && (
                        <img 
                          src={project.originalImage} 
                          alt="原始图像" 
                          style={{width: '50px', height: '50px', objectFit: 'cover', borderRadius: '5px'}}
                        />
                      )}
                    </td>
                    <td>
                      {project.videoURL && (
                        <video 
                          src={project.videoURL} 
                          style={{width: '50px', height: '50px', objectFit: 'cover', borderRadius: '5px'}}
                          muted
                        />
                      )}
                    </td>
                    <td>
                      {project.markerImage && (
                        <img 
                          src={project.markerImage} 
                          alt="标记图像" 
                          style={{width: '50px', height: '50px', objectFit: 'cover', borderRadius: '5px'}}
                        />
                      )}
                    </td>
                    <td>{new Date(project.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn btn-secondary"
                          onClick={() => openEditModal(project)}
                        >
                          <i className="fas fa-edit"></i> 编辑
                        </button>
                        <button 
                          className="btn btn-danger"
                          onClick={() => handleDelete(project._id)}
                        >
                          <i className="fas fa-trash"></i> 删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
                <span className="close-modal" onClick={closeModals}>&times;</span>
              </div>
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label>项目名称</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="输入项目名称"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>原始图像URL</label>
                  <input
                    type="url"
                    value={formData.originalImage}
                    onChange={(e) => setFormData({...formData, originalImage: e.target.value})}
                    placeholder="输入原始图像URL"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>AR视频URL</label>
                  <input
                    type="url"
                    value={formData.videoURL}
                    onChange={(e) => setFormData({...formData, videoURL: e.target.value})}
                    placeholder="输入AR视频URL"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>标记图像URL</label>
                  <input
                    type="url"
                    value={formData.markerImage}
                    onChange={(e) => setFormData({...formData, markerImage: e.target.value})}
                    placeholder="输入标记图像URL"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-success" style={{width: '100%'}}>
                  <i className="fas fa-save"></i> 创建项目
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 编辑项目模态框 */}
        {showEditModal && (
          <div className="modal">
            <div className="modal-content">
              <div className="modal-header">
                <h2>编辑项目</h2>
                <span className="close-modal" onClick={closeModals}>&times;</span>
              </div>
              <form onSubmit={handleUpdate}>
                <div className="form-group">
                  <label>项目名称</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>原始图像URL</label>
                  <input
                    type="url"
                    value={editFormData.originalImage}
                    onChange={(e) => setEditFormData({...editFormData, originalImage: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>AR视频URL</label>
                  <input
                    type="url"
                    value={editFormData.videoURL}
                    onChange={(e) => setEditFormData({...editFormData, videoURL: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>标记图像URL</label>
                  <input
                    type="url"
                    value={editFormData.markerImage}
                    onChange={(e) => setEditFormData({...editFormData, markerImage: e.target.value})}
                  />
                </div>
                <button type="submit" className="btn btn-success" style={{width: '100%'}}>
                  <i className="fas fa-save"></i> 更新项目
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
