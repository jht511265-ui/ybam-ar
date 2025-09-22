import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Home() {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [detected, setDetected] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [cameraStatus, setCameraStatus] = useState('点击"开启相机"按钮开始扫描');
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [projects, setProjects] = useState([]);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
    
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      const user = localStorage.getItem('user');
      if (token && user) {
        setIsLoggedIn(true);
      }
      
      // 加载项目数据
      fetchProjects();
    }
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('获取项目失败:', error);
    }
  };

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraStatus('您的浏览器不支持摄像头功能');
        setShowPermissionHelp(true);
        return;
      }

      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
      if (!isSecure) {
        setCameraStatus('请在HTTPS环境或localhost中访问此页面');
        setShowPermissionHelp(true);
        return;
      }

      setCameraStatus('正在请求摄像头权限...');
      setScanning(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOpen(true);
      setCameraStatus('摄像头已开启，请扫描AR标记图像');
      setShowPermissionHelp(false);
      
      // 开始AR扫描检测
      startARDetection();
      
    } catch (error) {
      console.error('摄像头访问错误:', error);
      setScanning(false);
      
      if (error.name === 'NotAllowedError') {
        setCameraStatus('摄像头权限已被拒绝，请检查浏览器设置');
      } else if (error.name === 'NotFoundError') {
        setCameraStatus('未找到可用的摄像头设备');
      } else if (error.name === 'NotReadableError') {
        setCameraStatus('摄像头设备正被其他应用程序使用');
      } else {
        setCameraStatus('无法访问摄像头: ' + error.message);
      }
      setShowPermissionHelp(true);
    }
  };

  const startARDetection = () => {
    // 模拟AR检测逻辑
    let detectionCount = 0;
    
    scanIntervalRef.current = setInterval(() => {
      if (!videoRef.current) return;
      
      // 模拟检测过程 - 在实际应用中这里应该使用AR.js或其他AR库
      detectionCount++;
      
      // 每3秒尝试检测一次
      if (detectionCount % 3 === 0 && projects.length > 0) {
        const randomProject = projects[Math.floor(Math.random() * projects.length)];
        const isDetected = Math.random() > 0.7; // 30%的检测概率
        
        if (isDetected) {
          setDetected(true);
          setCurrentProject(randomProject);
          setCameraStatus(`已检测到项目: ${randomProject.name}`);
          
          // 停止扫描
          clearInterval(scanIntervalRef.current);
        }
      }
    }, 1000);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    setIsCameraOpen(false);
    setDetected(false);
    setCurrentProject(null);
    setScanning(false);
    setCameraStatus('摄像头已关闭，点击"开启相机"重新开始');
  };

  const resetScan = () => {
    setDetected(false);
    setCurrentProject(null);
    setScanning(true);
    setCameraStatus('请扫描新的AR标记图像');
    startARDetection();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('authToken', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        setIsLoggedIn(true);
        setShowLogin(false);
        setUsername('');
        setPassword('');
        router.push('/admin');
      } else {
        setLoginError(data.message || '登录失败');
      }
    } catch (error) {
      setLoginError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
    setIsLoggedIn(false);
  };

  if (!isClient) {
    return (
      <div className="container">
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <Head>
        <title>马佛青文化委员会AR项目管理系统</title>
        <meta name="description" content="马佛青文化委员会AR项目管理系统 - 体验增强现实的佛法传播" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </Head>

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Segoe UI', 'Microsoft YaHei', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
          background: linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d);
          min-height: 100vh;
          color: #fff;
          display: flex;
          flex-direction: column;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
          flex: 1;
        }
        
        /* Header Styles */
        header {
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        
        .logo {
          font-size: 1.5rem;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .logo i {
          color: #fdbb2d;
          font-size: 2rem;
        }
        
        .logo-text {
          background: linear-gradient(to right, #fdbb2d, #b21f1f);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 700;
        }
        
        .auth-buttons {
          display: flex;
          gap: 15px;
        }
        
        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 25px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #4e54c8, #8f94fb);
          color: white;
          box-shadow: 0 4px 15px rgba(78, 84, 200, 0.4);
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(78, 84, 200, 0.6);
        }
        
        .btn-secondary {
          background: transparent;
          border: 2px solid #4e54c8;
          color: #4e54c8;
        }
        
        .btn-secondary:hover {
          background: rgba(78, 84, 200, 0.1);
        }
        
        .btn-success {
          background: linear-gradient(135deg, #28a745, #20c997);
          color: white;
          box-shadow: 0 4px 15px rgba(40, 167, 69, 0.4);
        }
        
        .btn-success:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(40, 167, 69, 0.6);
        }
        
        .btn-danger {
          background: linear-gradient(135deg, #dc3545, #e83e8c);
          color: white;
          box-shadow: 0 4px 15px rgba(220, 53, 69, 0.4);
        }
        
        .btn-danger:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(220, 53, 69, 0.6);
        }
        
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }
        
        /* Hero Section */
        .hero {
          text-align: center;
          padding: 3rem 0;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 20px;
          margin: 2rem 0;
          backdrop-filter: blur(10px);
        }
        
        .hero h1 {
          font-size: 3rem;
          margin-bottom: 1rem;
          background: linear-gradient(to right, #fdbb2d, #b21f1f);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 800;
        }
        
        .hero p {
          font-size: 1.2rem;
          max-width: 800px;
          margin: 0 auto 2rem;
          color: #e1e1e1;
          line-height: 1.6;
        }
        
        /* Partner Logo */
        .partner-logo {
          text-align: center;
          margin: 2rem 0;
          padding: 2rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 15px;
          backdrop-filter: blur(10px);
        }
        
        .partner-logo img {
          max-width: 300px;
          max-height: 120px;
          margin-bottom: 1rem;
          border-radius: 10px;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }
        
        .partner-logo h3 {
          color: #fdbb2d;
          margin-bottom: 0.5rem;
          font-size: 1.5rem;
        }
        
        .partner-logo p {
          color: #e1e1e1;
          font-size: 1rem;
        }
        
        /* Camera Section */
        .camera-section {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
        }
        
        .camera-status {
          text-align: center;
          margin-bottom: 1rem;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 10px;
          font-size: 1.1rem;
        }
        
        .camera-status.scanning {
          color: #fdbb2d;
          animation: pulse 2s infinite;
        }
        
        .camera-status.detected {
          color: #00ff66;
          background: rgba(0, 255, 102, 0.1);
        }
        
        .camera-frame {
          width: 100%;
          height: 500px;
          background: #000;
          border-radius: 20px;
          overflow: hidden;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          border: 3px solid #4e54c8;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
        
        .camera-placeholder {
          text-align: center;
          color: #4e54c8;
          padding: 2rem;
        }
        
        .camera-placeholder i {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        
        .camera-placeholder p {
          font-size: 1.1rem;
          margin-top: 1rem;
        }
        
        .camera-feed {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .scan-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        
        .scan-line {
          position: absolute;
          width: 100%;
          height: 4px;
          background: linear-gradient(to right, transparent, #fdbb2d, transparent);
          top: 20%;
          animation: scan 3s ease-in-out infinite;
          box-shadow: 0 0 20px #fdbb2d;
        }
        
        .detection-indicator {
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(0, 0, 0, 0.8);
          padding: 10px 15px;
          border-radius: 25px;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 10;
          backdrop-filter: blur(10px);
        }
        
        .detection-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ff4d4d;
          transition: all 0.3s ease;
        }
        
        .detection-dot.active {
          background: #00ff66;
          box-shadow: 0 0 15px #00ff66;
          animation: pulse 1.5s infinite;
        }
        
        .ar-content {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 5;
          text-align: center;
        }
        
        .ar-video {
          max-width: 300px;
          max-height: 200px;
          border-radius: 15px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
          border: 3px solid #fdbb2d;
        }
        
        .project-info {
          background: rgba(0, 0, 0, 0.9);
          padding: 1rem;
          border-radius: 10px;
          margin-top: 1rem;
          backdrop-filter: blur(10px);
        }
        
        .camera-controls {
          display: flex;
          justify-content: center;
          gap: 15px;
          margin-top: 2rem;
          flex-wrap: wrap;
        }
        
        /* Permission Help */
        .permission-help {
          background: rgba(0, 0, 0, 0.7);
          border-radius: 10px;
          padding: 1.5rem;
          margin-top: 1rem;
          backdrop-filter: blur(10px);
        }
        
        .permission-help h3 {
          color: #fdbb2d;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .permission-help ul {
          text-align: left;
          margin-left: 2rem;
        }
        
        .permission-help li {
          margin-bottom: 0.5rem;
          line-height: 1.5;
        }
        
        /* Modals */
        .modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.9);
          z-index: 1000;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }
        
        .modal-content {
          background: linear-gradient(135deg, #1a2a6c, #3a3f7d);
          width: 100%;
          max-width: 500px;
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
          position: relative;
          max-height: 90vh;
          overflow-y: auto;
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        
        .modal-header h2 {
          color: #fdbb2d;
          font-size: 1.5rem;
        }
        
        .close-modal {
          font-size: 2rem;
          cursor: pointer;
          color: #fdbb2d;
          transition: color 0.3s ease;
        }
        
        .close-modal:hover {
          color: #ff6b6b;
        }
        
        .form-group {
          margin-bottom: 1.5rem;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          color: #fdbb2d;
          font-weight: 600;
        }
        
        .form-group input {
          width: 100%;
          padding: 12px 15px;
          border-radius: 10px;
          border: 2px solid #4e54c8;
          background: rgba(0, 0, 0, 0.3);
          color: white;
          font-size: 1rem;
          transition: border-color 0.3s ease;
        }
        
        .form-group input:focus {
          outline: none;
          border-color: #fdbb2d;
        }
        
        .login-error {
          color: #ff6b6b;
          text-align: center;
          margin: 1rem 0;
          padding: 0.5rem;
          background: rgba(255, 107, 107, 0.1);
          border-radius: 5px;
        }
        
        /* Footer */
        footer {
          text-align: center;
          padding: 2rem;
          background: rgba(0, 0, 0, 0.7);
          margin-top: 3rem;
          backdrop-filter: blur(10px);
        }
        
        footer p {
          margin: 0.5rem 0;
          color: #e1e1e1;
        }
        
        /* Animations */
        @keyframes scan {
          0% { top: 10%; }
          50% { top: 90%; }
          100% { top: 10%; }
        }
        
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        
        .loading-screen {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          gap: 1rem;
        }
        
        .spinner {
          width: 50px;
          height: 50px;
          border: 5px solid rgba(255, 255, 255, 0.3);
          border-top: 5px solid #fdbb2d;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
          header {
            padding: 1rem;
            flex-direction: column;
            gap: 1rem;
          }
          
          .hero h1 {
            font-size: 2rem;
          }
          
          .hero p {
            font-size: 1rem;
            padding: 0 1rem;
          }
          
          .camera-frame {
            height: 400px;
          }
          
          .camera-controls {
            flex-direction: column;
            align-items: center;
          }
          
          .btn {
            width: 100%;
            max-width: 300px;
            justify-content: center;
          }
          
          .partner-logo img {
            max-width: 250px;
          }
          
          .ar-video {
            max-width: 250px;
            max-height: 150px;
          }
        }
        
        @media (max-width: 480px) {
          .container {
            padding: 0 10px;
          }
          
          .hero {
            padding: 2rem 1rem;
          }
          
          .camera-frame {
            height: 300px;
          }
          
          .modal-content {
            padding: 1.5rem;
            margin: 10px;
          }
        }
      `}</style>

      {/* Header */}
      <header>
        <div className="logo">
          <i className="fas fa-vr-cardboard"></i>
          <span className="logo-text">马佛青AR体验系统</span>
        </div>
        <div className="auth-buttons">
          {isLoggedIn ? (
            <>
              <button className="btn btn-success" onClick={() => router.push('/admin')}>
                <i className="fas fa-cogs"></i> 管理后台
              </button>
              <button className="btn btn-secondary" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt"></i> 退出
              </button>
            </>
          ) : (
            <button className="btn btn-secondary" onClick={() => setShowLogin(true)}>
              <i className="fas fa-user-lock"></i> 管理员登录
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="container">
        <div className="hero">
          <h1>AR增强现实体验平台</h1>
          <p>使用手机摄像头扫描特定图像，探索隐藏在图像中的佛法智慧与传统文化</p>
          
          <div className="partner-logo">
            <img 
              src="https://ybam-wordpress-media.s3.ap-southeast-1.amazonaws.com/wp-content/uploads/2024/05/03162711/ybamlogo2.png" 
              alt="马来西亚佛教青年总会标志" 
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'block';
              }}
            />
            <div style={{display: 'none'}}>
              <i className="fas fa-dharmachakra" style={{fontSize: '4rem', color: '#fdbb2d', marginBottom: '1rem'}}></i>
            </div>
            <h3>马来西亚佛教青年总会</h3>
            <p>Young Buddhist Association of Malaysia</p>
          </div>
          
          {/* Camera Section */}
          <div className="camera-section">
            <div className={`camera-status ${scanning ? 'scanning' : ''} ${detected ? 'detected' : ''}`}>
              <i className={`fas ${scanning ? 'fa-search' : detected ? 'fa-check-circle' : 'fa-info-circle'}`}></i>
              {cameraStatus}
            </div>
            
            <div className="camera-frame">
              {!isCameraOpen ? (
                <div className="camera-placeholder">
                  <i className="fas fa-camera"></i>
                  <p>点击下方按钮开启摄像头</p>
                  <p>请确保授予摄像头访问权限</p>
                </div>
              ) : (
                <>
                  <video 
                    ref={videoRef} 
                    className="camera-feed" 
                    autoPlay 
                    playsInline 
                    muted
                  />
                  <div className="scan-overlay">
                    {scanning && <div className="scan-line" />}
                    <div className="detection-indicator">
                      <div className={`detection-dot ${detected ? 'active' : ''}`}></div>
                      <span>{detected ? '已检测' : '扫描中'}</span>
                    </div>
                  </div>
                  
                  {detected && currentProject && (
                    <div className="ar-content">
                      <video 
                        className="ar-video"
                        src={currentProject.videoURL} 
                        controls 
                        autoPlay 
                        loop 
                        playsInline 
                        muted
                      />
                      <div className="project-info">
                        <h4>{currentProject.name}</h4>
                        <p>AR内容已加载</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="camera-controls">
              {!isCameraOpen ? (
                <button className="btn btn-primary" onClick={startCamera} disabled={scanning}>
                  <i className="fas fa-camera"></i> 开启相机扫描
                </button>
              ) : (
                <>
                  {detected ? (
                    <button className="btn btn-success" onClick={resetScan}>
                      <i className="fas fa-redo"></i> 重新扫描
                    </button>
                  ) : (
                    <button className="btn btn-secondary" onClick={stopCamera}>
                      <i className="fas fa-stop"></i> 停止扫描
                    </button>
                  )}
                </>
              )}
              <button className="btn btn-secondary" onClick={() => setShowHelpModal(true)}>
                <i className="fas fa-question-circle"></i> 使用帮助
              </button>
            </div>
            
            {showPermissionHelp && (
              <div className="permission-help">
                <h3><i className="fas fa-exclamation-triangle"></i> 摄像头访问提示</h3>
                <ul>
                  <li>确保您使用的是HTTPS安全连接</li>
                  <li>检查浏览器权限设置，允许此网站使用摄像头</li>
                  <li>手机用户请使用Chrome或Safari浏览器</li>
                  <li>确保没有其他应用正在使用摄像头</li>
                  <li>如仍无法使用，请尝试刷新页面</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Login Modal */}
      {showLogin && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>管理员登录</h2>
              <span className="close-modal" onClick={() => setShowLogin(false)}>&times;</span>
            </div>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="username">用户名</label>
                <input
                  type="text"
                  id="username"
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">密码</label>
                <input
                  type="password"
                  id="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {loginError && <div className="login-error">{loginError}</div>}
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{width: '100%'}} 
                disabled={isLoading}
              >
                <i className="fas fa-sign-in-alt"></i> 
                {isLoading ? '登录中...' : '登录系统'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>AR扫描使用指南</h2>
              <span className="close-modal" onClick={() => setShowHelpModal(false)}>&times;</span>
            </div>
            <div className="form-group">
              <h3><i className="fas fa-mobile-alt"></i> 使用步骤</h3>
              <ol style={{marginLeft: '1.5rem', lineHeight: '1.8'}}>
                <li>点击"开启相机扫描"按钮授权摄像头访问</li>
                <li>将摄像头对准已注册的AR标记图像</li>
                <li>保持手机稳定，等待系统自动识别</li>
                <li>识别成功后即可观看AR增强内容</li>
                <li>可移动手机从不同角度体验AR效果</li>
              </ol>
              
              <h3><i className="fas fa-image"></i> 支持的图像类型</h3>
              <ul style={{marginLeft: '1.5rem', lineHeight: '1.8'}}>
                <li>马佛青文化委员会指定的AR图像</li>
                <li>高对比度、特征明显的图片</li>
                <li>印刷清晰的手绘或设计图案</li>
              </ul>
              
              <h3><i className="fas fa-headset"></i> 技术支持</h3>
              <p>如遇到技术问题，请联系：马佛青文化委员会技术支援</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer>
        <p>© 2025 马来西亚佛教青年总会文化委员会 - AR增强现实体验系统</p>
        <p>技术支持: 马佛青文化委员会 | 传承佛法 · 创新传播</p>
      </footer>
    </div>
  );
}
