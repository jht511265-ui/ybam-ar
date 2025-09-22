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
  const videoRef = useRef(null);
  const streamRef = useRef(null);
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
      
      // 尝试多种摄像头配置
      const constraints = {
        video: {
          facingMode: 'environment', // 优先使用后置摄像头
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        }
      };

      console.log('开始获取摄像头权限...');
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('摄像头权限获取成功');
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // 等待视频加载完成
        videoRef.current.onloadedmetadata = () => {
          console.log('视频元数据加载完成');
          videoRef.current.play().then(() => {
            console.log('视频开始播放');
          }).catch(error => {
            console.error('视频播放失败:', error);
          });
        };
        
        videoRef.current.onplay = () => {
          console.log('视频开始播放');
          setIsCameraOpen(true);
          setCameraStatus('摄像头已开启，请扫描图像');
          setShowPermissionHelp(false);
        };
        
        videoRef.current.onerror = (error) => {
          console.error('视频错误:', error);
          setCameraStatus('视频流加载失败');
        };
      }
      
      // 开始简单的图像检测（模拟AR效果）
      startSimpleDetection();
      
    } catch (error) {
      console.error('摄像头访问错误:', error);
      setCameraStatus('无法访问摄像头: ' + error.message);
      setShowPermissionHelp(true);
      
      if (error.name === 'NotAllowedError') {
        setCameraStatus('摄像头权限已被拒绝，请检查浏览器设置');
      } else if (error.name === 'NotFoundError') {
        setCameraStatus('未找到可用的摄像头设备');
      } else if (error.name === 'NotReadableError') {
        setCameraStatus('摄像头设备正被其他应用程序使用');
      } else if (error.name === 'OverconstrainedError') {
        setCameraStatus('无法满足摄像头要求，尝试使用其他浏览器');
      }
    }
  };

  const startSimpleDetection = () => {
    // 简化的检测逻辑 - 使用定时器模拟AR检测
    const detectionInterval = setInterval(() => {
      if (!videoRef.current || !isCameraOpen) {
        clearInterval(detectionInterval);
        return;
      }
      
      // 模拟检测逻辑 - 在实际应用中应该使用专业的AR库
      const isDetected = Math.random() > 0.8; // 20%的检测概率
      
      if (isDetected && projects.length > 0) {
        setDetected(true);
        const randomProject = projects[Math.floor(Math.random() * projects.length)];
        setCurrentProject(randomProject);
        
        // 更新视频位置和角度
        updateVideoPosition();
      } else {
        setDetected(false);
        setCurrentProject(null);
      }
    }, 2000);

    return () => clearInterval(detectionInterval);
  };

  const updateVideoPosition = () => {
    const videoElement = document.getElementById('ar-video');
    if (!videoElement) return;

    // 模拟3D变换效果
    const rotationX = Math.sin(Date.now() / 1000) * 5;
    const rotationY = Math.cos(Date.now() / 1000) * 5;
    
    videoElement.style.transform = `perspective(1000px) rotateX(${rotationX}deg) rotateY(${rotationY}deg)`;
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
    setDetected(false);
    setCurrentProject(null);
    setCameraStatus('摄像头已关闭，点击"开启相机"重新开始');
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
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <Head>
        <title>马佛青文化委员会AR项目管理系统</title>
        <meta name="description" content="马佛青文化委员会AR项目管理系统" />
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
          display: flex;
          flex-direction: column;
        }
        
        header {
          background-color: rgba(0, 0, 0, 0.7);
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        
        .logo {
          font-size: 1.8rem;
          font-weight: bold;
          display: flex;
          align-items: center;
        }
        
        .logo i {
          margin-right: 10px;
          color: #fdbb2d;
        }
        
        .auth-buttons {
          display: flex;
          gap: 15px;
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
        
        .container {
          max-width: 1200px;
          margin: 2rem auto;
          padding: 0 20px;
          flex: 1;
        }
        
        .hero {
          text-align: center;
          padding: 3rem 0;
          background-color: rgba(0, 0, 0, 0.5);
          border-radius: 20px;
          margin-bottom: 2rem;
        }
        
        .hero h1 {
          font-size: 3rem;
          margin-bottom: 1rem;
          background: linear-gradient(to right, #fdbb2d, #b21f1f);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .hero p {
          font-size: 1.2rem;
          max-width: 800px;
          margin: 0 auto 2rem;
          color: #e1e1e1;
        }
        
        .camera-container {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          position: relative;
        }
        
        .camera-frame {
          width: 100%;
          height: 500px;
          background-color: #000;
          border-radius: 20px;
          overflow: hidden;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          border: 4px solid #4e54c8;
        }
        
        .camera-placeholder {
          font-size: 5rem;
          color: #4e54c8;
          text-align: center;
          padding: 20px;
        }
        
        .camera-placeholder p {
          margin-top: 20px;
          font-size: 1rem;
        }
        
        .camera-feed {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        
        .scan-line {
          position: absolute;
          width: 100%;
          height: 8px;
          background: linear-gradient(to right, transparent, #fdbb2d, transparent);
          top: 50%;
          animation: scan 2s linear infinite;
          z-index: 5;
        }
        
        @keyframes scan {
          0% { top: 10%; }
          50% { top: 90%; }
          100% { top: 10%; }
        }
        
        .camera-controls {
          display: flex;
          justify-content: center;
          margin-top: 20px;
          gap: 15px;
        }
        
        .ar-video-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10;
          pointer-events: none;
        }
        
        .ar-video {
          max-width: 300px;
          max-height: 200px;
          box-shadow: 0 0 30px rgba(0, 0, 0, 0.7);
          border: 3px solid #fdbb2d;
          border-radius: 10px;
          transition: transform 0.1s ease;
          transform-style: preserve-3d;
        }
        
        .detection-indicator {
          position: absolute;
          top: 20px;
          right: 20px;
          background-color: rgba(0, 0, 0, 0.7);
          padding: 10px 15px;
          border-radius: 50px;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 15;
        }
        
        .detection-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background-color: #ff4d4d;
        }
        
        .detection-dot.active {
          background-color: #00ff66;
          animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        
        .marker-outline {
          position: absolute;
          border: 3px solid #00ff66;
          box-shadow: 0 0 15px #00ff66;
          z-index: 8;
          pointer-events: none;
          display: none;
        }
        
        .permission-help {
          background-color: rgba(0, 0, 0, 0.5);
          border-radius: 10px;
          padding: 15px;
          margin-top: 20px;
          text-align: left;
        }
        
        .permission-help h3 {
          color: #fdbb2d;
          margin-bottom: 10px;
        }
        
        .permission-help ul {
          text-align: left;
          margin-left: 20px;
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
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #fdbb2d;
        }
        
        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          border: 2px solid #4e54c8;
          background-color: rgba(0, 0, 0, 0.3);
          color: white;
        }
        
        .partner-logo {
          text-align: center;
          margin: 2rem 0;
          padding: 1.5rem;
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 15px;
        }
        
        .partner-logo img {
          max-width: 300px;
          max-height: 120px;
          margin-bottom: 1rem;
          border-radius: 10px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }
        
        .partner-logo h3 {
          color: #fdbb2d;
          margin-bottom: 0.5rem;
        }
        
        .partner-logo p {
          color: #e1e1e1;
          font-size: 1rem;
        }
        
        footer {
          text-align: center;
          padding: 2rem;
          background-color: rgba(0, 0, 0, 0.7);
          margin-top: 2rem;
        }
        
        @media (max-width: 768px) {
          .hero h1 {
            font-size: 2rem;
          }
          
          .camera-frame {
            height: 400px;
          }
          
          .partner-logo img {
            max-width: 250px;
          }
        }

        /* 调试信息 */
        .debug-info {
          position: absolute;
          bottom: 10px;
          left: 10px;
          background: rgba(0,0,0,0.7);
          color: white;
          padding: 5px 10px;
          border-radius: 5px;
          font-size: 12px;
          z-index: 20;
        }
      `}</style>

      <header>
        <div className="logo">
          <i className="fas fa-cube"></i>
          <span>马佛青文化委员会AR项目管理系统</span>
        </div>
        <div className="auth-buttons">
          {isLoggedIn ? (
            <button className="btn btn-secondary" onClick={handleLogout}>
              <i className="fas fa-user"></i> 登出
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={() => setShowLogin(true)}>
              <i className="fas fa-user-lock"></i> 登入
            </button>
          )}
        </div>
      </header>

      <div className="container">
        <div className="hero">
          <h1>AR图像识别体验平台</h1>
          <p>使用您的手机摄像头扫描特定图像。发现隐藏在图像中的佛法！</p>
          
          <div className="partner-logo">
            <img src="https://ybam-wordpress-media.s3.ap-southeast-1.amazonaws.com/wp-content/uploads/2024/05/03162711/ybamlogo2.png" alt="马来西亚佛教青年总会标志" />
            <h3>马来西亚佛教青年总会</h3>
            <p>Young Buddhist Association of Malaysia</p>
          </div>
          
          <div className="camera-container">
            <div className="camera-frame">
              <div className="camera-placeholder" style={{ display: isCameraOpen ? 'none' : 'flex' }}>
                <i className="fas fa-camera"></i>
                <p>{cameraStatus}</p>
              </div>
              <video 
                ref={videoRef} 
                className="camera-feed" 
                autoPlay 
                playsInline 
                muted
                style={{ display: isCameraOpen ? 'block' : 'none' }}
                onLoadedData={() => console.log('Camera feed loaded')}
                onError={(e) => console.error('Camera error:', e)}
              />
              <div className="scan-line" style={{ display: isCameraOpen ? 'block' : 'none' }} />
              <div className="detection-indicator" style={{ display: isCameraOpen ? 'flex' : 'none' }}>
                <div className={`detection-dot ${detected ? 'active' : ''}`} />
                <span>标记检测</span>
              </div>
              
              <div className="ar-video-overlay" style={{ display: detected && currentProject ? 'block' : 'none' }}>
                {currentProject && (
                  <video 
                    id="ar-video"
                    className="ar-video" 
                    src={currentProject.videoURL} 
                    controls 
                    autoPlay 
                    loop 
                    playsInline 
                    muted
                  />
                )}
              </div>

              {/* 调试信息 */}
              {isCameraOpen && (
                <div className="debug-info">
                  状态: {videoRef.current?.readyState === 4 ? '就绪' : '加载中'}
                </div>
              )}
            </div>
            <div className="camera-controls">
              {!isCameraOpen ? (
                <button className="btn btn-primary" onClick={startCamera}>
                  <i className="fas fa-camera"></i> 开启相机
                </button>
              ) : (
                <button className="btn btn-secondary" onClick={stopCamera}>
                  <i className="fas fa-stop-circle"></i> 关闭相机
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setShowHelpModal(true)}>
                <i className="fas fa-question-circle"></i> 使用说明
              </button>
            </div>
            
            {showPermissionHelp && (
              <div className="permission-help">
                <h3>无法访问摄像头？请尝试以下方法：</h3>
                <ul>
                  <li>确保您使用的是HTTPS连接（安全连接）</li>
                  <li>检查浏览器权限设置，允许此网站使用摄像头</li>
                  <li>如果您使用手机，请尝试使用系统浏览器（Chrome/Safari）</li>
                  <li>确保没有其他应用程序正在使用摄像头</li>
                  <li>刷新页面后重试</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {showLogin && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>管理员登入</h2>
              <span className="close-modal" onClick={() => setShowLogin(false)}>&times;</span>
            </div>
            <div className="form-group">
              <label htmlFor="username">用户名</label>
              <input
                type="text"
                id="username"
                placeholder="输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">密码</label>
              <input
                type="password"
                id="password"
                placeholder="输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {loginError && <p style={{ color: 'red', marginBottom: '15px' }}>{loginError}</p>}
            <button 
              className="btn btn-primary" 
              style={{width: '100%'}} 
              onClick={handleLogin}
              disabled={isLoading}
            >
              <i className="fas fa-sign-in-alt"></i> {isLoading ? '登入中...' : '登入'}
            </button>
          </div>
        </div>
      )}

      {showHelpModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>使用说明</h2>
              <span className="close-modal" onClick={() => setShowHelpModal(false)}>&times;</span>
            </div>
            <div className="form-group">
              <h3>如何使用AR扫描功能</h3>
              <ol>
                <li>点击"开启相机"按钮允许访问您的摄像头</li>
                <li>将摄像头对准已注册的AR标记图像</li>
                <li>系统会自动识别图像并显示增强现实内容</li>
                <li>您可以移动设备从不同角度查看AR内容</li>
              </ol>
              
              <h3>支持的图像类型</h3>
              <ul>
                <li>手绘彩色图像</li>
                <li>高对比度图案</li>
                <li>包含明显特征的图片</li>
              </ul>
              
              <h3>技术支持</h3>
              <p>如遇到任何问题，请联系技术支持: 马佛青文化委员会TJH</p>

              <h3>相机问题解决</h3>
              <ul>
                <li>使用 Chrome 或 Safari 浏览器</li>
                <li>确保网址以 https:// 开头</li>
                <li>允许网站使用摄像头权限</li>
                <li>重启浏览器后重试</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <footer>
        <p>© 2025 马佛青文化委员会AR项目管理系统 - 所有权利保留</p>
        <p>技术支持: 马佛青文化委员会TJH</p>
      </footer>
    </div>
  );
}
