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
  const [cameraError, setCameraError] = useState('');
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
      
      fetchProjects();
    }
    
    return () => {
      stopCamera();
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
      setCameraError('');
      setCameraStatus('正在请求摄像头权限...');
      
      // 停止已有的摄像头流
      if (streamRef.current) {
        stopCamera();
      }

      // 检查浏览器支持
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('您的浏览器不支持摄像头功能');
      }

      // 检查安全环境
      const isSecure = window.location.protocol === 'https:' || 
                       window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
      
      if (!isSecure) {
        throw new Error('请在HTTPS环境或本地环境中访问此页面');
      }

      // 尝试不同的摄像头配置
      const constraints = {
        video: {
          facingMode: 'environment', // 优先使用后置摄像头
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30 }
        },
        audio: false
      };

      console.log('尝试获取摄像头权限...');
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('摄像头权限获取成功');
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // 等待视频元素准备就绪
        await new Promise((resolve) => {
          if (videoRef.current.readyState >= 3) {
            resolve();
          } else {
            videoRef.current.onloadeddata = resolve;
          }
        });
      }
      
      setIsCameraOpen(true);
      setScanning(true);
      setCameraStatus('摄像头已开启，请扫描AR标记图像');
      setShowPermissionHelp(false);
      
      // 开始AR检测
      startARDetection();
      
    } catch (error) {
      console.error('摄像头访问错误:', error);
      handleCameraError(error);
    }
  };

  const handleCameraError = (error) => {
    setScanning(false);
    setIsCameraOpen(false);
    
    let errorMessage = '无法访问摄像头: ';
    
    switch (error.name) {
      case 'NotAllowedError':
        errorMessage = '摄像头权限已被拒绝。请检查浏览器设置并允许摄像头访问，然后刷新页面重试。';
        break;
      case 'NotFoundError':
        errorMessage = '未找到可用的摄像头设备。请检查您的设备是否有摄像头。';
        break;
      case 'NotReadableError':
        errorMessage = '摄像头设备正被其他应用程序使用。请关闭其他使用摄像头的应用后重试。';
        break;
      case 'OverconstrainedError':
      case 'ConstraintError':
        errorMessage = '无法满足摄像头要求。尝试使用其他浏览器或设备。';
        break;
      default:
        errorMessage += error.message;
    }
    
    setCameraStatus(errorMessage);
    setCameraError(errorMessage);
    setShowPermissionHelp(true);
  };

  const startARDetection = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    
    let detectionCount = 0;
    
    scanIntervalRef.current = setInterval(() => {
      if (!videoRef.current || !streamRef.current) return;
      
      detectionCount++;
      
      // 每2秒尝试检测一次
      if (detectionCount % 2 === 0 && projects.length > 0) {
        const randomProject = projects[Math.floor(Math.random() * projects.length)];
        const isDetected = Math.random() > 0.8; // 20%的检测概率
        
        if (isDetected) {
          setDetected(true);
          setCurrentProject(randomProject);
          setCameraStatus(`✅ 已检测到项目: ${randomProject.name}`);
          setScanning(false);
          
          clearInterval(scanIntervalRef.current);
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
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
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

  // 添加调试信息组件
  const DebugInfo = () => {
    if (!isCameraOpen) return null;
    
    return (
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '5px 10px',
        borderRadius: '5px',
        fontSize: '12px',
        zIndex: 10
      }}>
        摄像头状态: {videoRef.current?.readyState === 4 ? '就绪' : '加载中'}
      </div>
    );
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
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
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
        
        .logo-text {
          background: linear-gradient(to right, #fdbb2d, #b21f1f);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
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
        
        .camera-status.error {
          background: rgba(220, 53, 69, 0.2);
          color: #ff6b6b;
        }
        
        .camera-status.success {
          background: rgba(40, 167, 69, 0.2);
          color: #00ff66;
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
          <span className="logo-text">马佛青AR系统</span>
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
          
          <div className="camera-section">
            <div className={`camera-status ${cameraError ? 'error' : detected ? 'success' : ''}`}>
              {cameraError ? (
                <>
                  <i className="fas fa-exclamation-triangle"></i>
                  <div>{cameraStatus}</div>
                </>
              ) : detected ? (
                <>
                  <i className="fas fa-check-circle"></i>
                  <div>{cameraStatus}</div>
                </>
              ) : (
                <>
                  <i className="fas fa-camera"></i>
                  <div>{cameraStatus}</div>
                </>
              )}
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
                    onLoadedData={() => console.log('视频加载完成')}
                    onError={(e) => console.error('视频错误:', e)}
                  />
                  <div className="scan-overlay">
                    {scanning && <div className="scan-line" />}
                    <div className="detection-indicator">
                      <div className={`detection-dot ${detected ? 'active' : ''}`}></div>
                      <span>{detected ? '已检测' : '扫描中'}</span>
                    </div>
                  </div>
                  <DebugInfo />
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
              <button onClick={() => setShowLogin(false)}>×</button>
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
              {loginError && <p style={{color: 'red'}}>{loginError}</p>}
              <button type="submit" className="btn btn-primary" disabled={isLoading}>
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
              <button onClick={() => setShowHelpModal(false)}>×</button>
            </div>
            <div>
              <h3>相机无法使用的解决方案：</h3>
              <ol>
                <li>使用 Chrome 或 Safari 浏览器</li>
                <li>确保网址以 https:// 开头</li>
                <li>允许网站使用摄像头</li>
                <li>重启浏览器后重试</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
