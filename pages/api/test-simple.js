// pages/api/test-simple.js
export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('✅ 简单测试API被调用，方法:', req.method);
    
    // 简单的成功响应
    res.status(200).json({
      success: true,
      message: '简单API测试成功！',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      method: req.method
    });

  } catch (error) {
    console.error('❌ 简单测试错误:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
