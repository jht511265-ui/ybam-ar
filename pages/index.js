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
  const canvasRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
    
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      const user = localStorage.getItem('user');
      if (token && user) {
        setIsLoggedIn(true);
      }
      
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
        console.log('加载项目数量:', data.length);
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

      const isSecure = window.location.protocol === 'https:' || 
                       window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
      
      if (!isSecure) {
        setCameraStatus('请在HTTPS环境或本地环境中访问此页面');
        setShowPermissionHelp(true);
        return;
      }

      setCameraStatus('正在请求摄像头权限...');
      setScanning(true);
      
      // 停止已有的摄像头流
      if (streamRef.current) {
        stopCamera();
      }

      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // 等待视频准备就绪
        await new Promise((resolve) => {
          if (videoRef.current.readyState >= 3) {
            resolve();
          } else {
            videoRef.current.onloadeddata = resolve;
          }
        });
      }
      
      setIsCameraOpen(true);
      setCameraStatus('摄像头已开启，请扫描AR标记图像');
      setShowPermissionHelp(false);
      
      // 开始AR检测
      startARDetection();
      
    } catch (error) {
      console.error('摄像头访问错误:', error);
      setScanning(false);
      
      if (error.name === 'NotAllowedError') {
        setCameraStatus('摄像头权限已被拒绝。请检查浏览器设置并允许摄像头访问，然后刷新页面重试。');
      } else if (error.name === 'NotFoundError') {
        setCameraStatus('未找到可用的摄像头设备。请检查您的设备是否有摄像头。');
      } else if (error.name === 'NotReadableError') {
        setCameraStatus('摄像头设备正被其他应用程序使用。请关闭其他使用摄像头的应用后重试。');
      } else {
        setCameraStatus('无法访问摄像头: ' + error.message);
      }
      setShowPermissionHelp(true);
    }
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // 设置canvas尺寸与视频一致
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // 绘制当前视频帧到canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // 返回base64图像数据
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const recognizeImage = async (imageData) => {
    try {
      // 模拟识别过程 - 随机选择一个项目
      if (projects.length > 0) {
        const randomProject = projects[Math.floor(Math.random() * projects.length)];
        return {
          success: true,
          data: {
            project: randomProject,
            confidence: Math.random() * 0.5 + 0.5
          }
        };
      }
      return null;
    } catch (error) {
      console.error('图像识别错误:', error);
      return null;
    }
  };

  const startARDetection = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    
    let detectionCount = 0;
    
    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !isCameraOpen) return;
      
      detectionCount++;
      
      // 每3秒尝试检测一次
      if (detectionCount % 3 === 0 && projects.length > 0) {
        try {
          // 模拟识别逻辑
          const isDetected = Math.random() > 0.7; // 30%的检测概率
          
          if (isDetected) {
            const randomProject = projects[Math.floor(Math.random() * projects.length)];
            setDetected(true);
            setCurrentProject(randomProject);
            setCameraStatus(`✅ 已识别项目: ${randomProject.name}`);
            setScanning(false);
            
            // 停止扫描
            clearInterval(scanIntervalRef.current);
          }
        } catch (error) {
          console.error('AR检测错误:', error);
        }
      }
    }, 1000);
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
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
    stopCamera();
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

      {/* 隐藏的canvas用于图像捕获 */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

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
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
          flex: 1;
        }
        
        header {
          background: rgba(0, 0, 0, 0.8);
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
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
        }
        
        .auth-buttons {
          display: flex;
          gap: 15px;
        }
        
        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 25px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .btn-primary {
          background: #4e54c8;
          color: white;
        }
        
        .btn-primary:hover {
          background: #3f43a1;
          transform: translateY(-2px);
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
          background: #28a745;
          color: white;
        }
        
        .btn-success:hover {
          background: #218838;
        }
        
        .btn-danger {
          background: #dc3545;
          color: white;
        }
        
        .btn-danger:hover {
          background: #bd2130;
        }
        
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .hero {
          text-align: center;
          padding: 2rem 0;
          margin: 1rem 0;
        }
        
        .hero h1 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          background: linear-gradient(to right, #fdbb2d, #b21f1f);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .camera-section {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .camera-status {
          text-align: center;
          padding: 1rem;
          margin: 1rem 0;
          background: rgba(0,0,0,0.5);
          border-radius: 10px;
          min-height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
        }
        
        .camera-status.scanning {
          color: #fdbb2d;
        }
        
        .camera-status.detected {
          color: #00ff66;
          background: rgba(0, 255, 102, 0.1);
        }
        
        .camera-frame {
          width: 100%;
          height: 400px;
          background: #000;
          border-radius: 15px;
          overflow: hidden;
          position: relative;
          border: 3px solid #4e54c8;
        }
        
        .camera-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #6c757d;
        }
        
        .camera-placeholder i {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        
        .camera-feed {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
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
          height: 3px;
          background: linear-gradient(to right, transparent, #fdbb2d, transparent);
          animation: scan 2s ease-in-out infinite;
        }
        
        .detection-indicator {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(0,0,0,0.7);
          padding: 5px 10px;
          border-radius: 15px;
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.8rem;
        }
        
        .detection-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ff4d4d;
        }
        
        .detection-dot.active {
          background: #00ff66;
          animation: pulse 1s infinite;
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
        }
        
        .camera-controls {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin: 1rem 0;
          flex-wrap: wrap;
        }
        
        .permission-help {
          background: rgba(0,0,0,0.7);
          padding: 1rem;
          border-radius: 10px;
          margin: 1rem 0;
        }
        
        .permission-help h3 {
          color: #fdbb2d;
          margin-bottom: 0.5rem;
        }
        
        .modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.8);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .modal-content {
          background: #1a2a6c;
          padding: 2rem;
          border-radius: 10px;
          max-width: 500px;
          width: 90%;
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
          margin-bottom: 1rem;
        }
        
        .form-group input {
          width: 100%;
          padding: 10px;
          border-radius: 5px;
          border: 1px solid #4e54c8;
          background: rgba(0,0,0,0.3);
          color: white;
        }
        
        .partner-logo {
          text-align: center;
          margin: 2rem 0;
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 15px;
        }
        
        .partner-logo img {
          max-width: 300px;
          max-height: 120px;
          margin-bottom: 1rem;
          border-radius: 10px;
        }
        
        footer {
          text-align: center;
          padding: 2rem;
          background: rgba(0, 0, 0, 0.7);
          margin-top: 2rem;
        }
        
        .loading-screen {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
        }
        
        .spinner {
          width: 50px;
          height: 50px;
          border: 5px solid rgba(255, 255, 255, 0.3);
          border-top: 5px solid #fdbb2d;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
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
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          .hero h1 {
            font-size: 2rem;
          }
          
          .camera-frame {
            height: 300px;
          }
          
          .camera-controls {
            flex-direction: column;
          }
          
          .btn {
            width: 100%;
            max-width: 300px;
          }
        }
      `}</style>

      <header>
        <div className="logo">
          <i className="fas fa-vr-cardboard"></i>
          <span>马佛青AR系统</span>
        </div>
        <div className="auth-buttons">
          {isLoggedIn ? (
            <button className="btn btn-secondary" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> 退出
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={() => setShowLogin(true)}>
              <i className="fas fa-user-lock"></i> 登录
            </button>
          )}
        </div>
      </header>

      <div className="container">
        <div className="hero">
          <h1>AR图像识别体验</h1>
          <p>扫描特定图像，发现隐藏的佛法内容</p>
          
          <div className="partner-logo">
            <img src="https://ybam-wordpress-media.s3.ap-southeast-1.amazonaws.com/wp-content/uploads/2024/05/03162711/ybamlogo2.png" alt="马来西亚佛教青年总会标志" />
            <h3>马来西亚佛教青年总会</h3>
            <p>Young Buddhist Association of Malaysia</p>
          </div>
          
          <div className="camera-section">
            <div className={`camera-status ${scanning ? 'scanning' : ''} ${detected ? 'detected' : ''}`}>
              <i className={`fas ${scanning ? 'fa-search' : detected ? 'fa-check-circle' : 'fa-info-circle'}`}></i>
              {cameraStatus}
            </div>
            
            <div className="camera-frame">
              {!isCameraOpen ? (
                <div className="camera-placeholder">
                  <i className="fas fa-camera"></i>
                  <p>准备扫描</p>
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
                      <span>{detected ? '已识别' : '扫描中'}</span>
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
                        <p>AR内容播放中</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="camera-controls">
              {!isCameraOpen ? (
                <button className="btn btn-primary" onClick={startCamera}>
                  <i className="fas fa-camera"></i> 开启相机
                </button>
              ) : (
                <>
                  {detected ? (
                    <button className="btn btn-success" onClick={resetScan}>
                      <i className="fas fa-redo"></i> 重新扫描
                    </button>
                  ) : (
                    <button className="btn btn-secondary" onClick={stopCamera}>
                      <i className="fas fa-stop"></i> 停止
                    </button>
                  )}
                </>
              )}
              <button className="btn btn-secondary" onClick={() => setShowHelpModal(true)}>
                <i className="fas fa-question-circle"></i> 帮助
              </button>
            </div>

            {showPermissionHelp && (
              <div className="permission-help">
                <h3>摄像头使用提示</h3>
                <ul>
                  <li>确保使用 HTTPS 连接</li>
                  <li>允许浏览器访问摄像头</li>
                  <li>检查摄像头是否被其他应用占用</li>
                  <li>尝试使用 Chrome 或 Safari 浏览器</li>
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
              <h2>管理员登录</h2>
              <button onClick={() => setShowLogin(false)} style={{background: 'none', border: 'none', color: '#fdbb2d', fontSize: '1.5rem'}}>×</button>
            </div>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <input
                  type="password"
                  placeholder="密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {loginError && <p style={{color: 'red', marginBottom: '1rem'}}>{loginError}</p>}
              <button type="submit" className="btn btn-primary" disabled={isLoading} style={{width: '100%'}}>
                {isLoading ? '登录中...' : '登录'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showHelpModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>使用帮助</h2>
              <button onClick={() => setShowHelpModal(false)} style={{background: 'none', border: 'none', color: '#fdbb2d', fontSize: '1.5rem'}}>×</button>
            </div>
            <div>
              <h3>AR扫描使用指南：</h3>
              <ol style={{paddingLeft: '1.5rem', lineHeight: '1.6'}}>
                <li>点击"开启相机"按钮授权摄像头访问</li>
                <li>将摄像头对准已注册的AR标记图像</li>
                <li>保持手机稳定，等待系统自动识别</li>
                <li>识别成功后即可观看AR增强内容</li>
              </ol>
              <h3 style={{marginTop: '1rem'}}>常见问题：</h3>
              <ul style={{paddingLeft: '1.5rem', lineHeight: '1.6'}}>
                <li>如果无法开启摄像头，请检查浏览器权限设置</li>
                <li>确保在光线充足的环境下扫描</li>
                <li>保持标记图像清晰可见</li>
                <li>如遇问题，请尝试刷新页面</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <footer>
        <p>© 2025 马来西亚佛教青年总会文化委员会 - AR增强现实体验系统</p>
        <p>技术支持: 马佛青文化委员会</p>
      </footer>
    </div>
  );
}
