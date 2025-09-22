// pages/api/test-simple.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    console.log('简单测试API被调用');
    
    res.status(200).json({
      success: true,
      message: '简单API测试成功',
      timestamp: new Date().toISOString(),
      data: {
        test: '这是一个不依赖数据库的测试'
      }
    });

  } catch (error) {
    console.error('简单测试错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
