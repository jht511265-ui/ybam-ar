// pages/api/debug-create.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  console.log('=== 调试创建API ===');
  console.log('请求体:', req.body);
  console.log('请求头:', req.headers);
  
  // 立即返回成功响应
  const project = {
    _id: 'debug_' + Date.now(),
    name: req.body?.name || '调试项目',
    originalImage: 'https://via.placeholder.com/800x600',
    videoURL: 'https://example.com/video.mp4',
    createdAt: new Date(),
    status: '调试成功'
  };
  
  console.log('返回项目:', project);
  
  res.status(201).json(project);
}
