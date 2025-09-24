// pages/api/auth/login.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 固定用户
const FIXED_USER = {
  username: 'admin2025',
  password: 'Tjh244466666',
  id: 'fixed-user-id-0001'
};

export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: '方法不允许' });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        message: '用户名和密码不能为空' 
      });
    }

    console.log('🔍 正在验证用户:', username);

    // 检查固定用户名和密码
    if (username !== FIXED_USER.username || password !== FIXED_USER.password) {
      console.warn('❌ 用户名或密码错误');
      return res.status(401).json({ 
        success: false,
        message: '用户名或密码错误' 
      });
    }

    // 生成token
    const token = jwt.sign(
      {
        userId: FIXED_USER.id,
        username: FIXED_USER.username
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ 登录成功:', FIXED_USER.username);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: FIXED_USER.id,
        username: FIXED_USER.username
      }
    });

  } catch (error) {
    console.error('🔥 认证错误:', error);
    res.status(500).json({ 
      success: false,
      message: '服务器内部错误'
    });
  }
}
