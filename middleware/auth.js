// middleware/auth.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Token验证失败:', error.message);
    throw new Error('Invalid token');
  }
}

// 认证中间件
export default function authMiddleware(handler) {
  return async (req, res) => {
    try {
      // 排除登录接口和OPTIONS请求
      if (req.url.includes('/api/auth') || req.method === 'OPTIONS') {
        return handler(req, res);
      }

      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('❌ 缺少认证头');
        return res.status(401).json({ message: '未授权访问' });
      }

      const token = authHeader.split(' ')[1];
      
      if (!token) {
        console.log('❌ Token为空');
        return res.status(401).json({ message: 'Token不能为空' });
      }

      // 验证token
      const decoded = verifyToken(token);
      req.user = decoded;
      
      console.log('✅ Token验证成功，用户:', decoded.username);
      return handler(req, res);
      
    } catch (error) {
      console.error('认证中间件错误:', error.message);
      return res.status(401).json({ message: 'Token无效或已过期' });
    }
  };
}
