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
            grid-template
