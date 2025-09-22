// pages/api/diagnose-db.js
export default async function handler(req, res) {
  try {
    const uri = process.env.MONGODB_URI;
    
    // 检查环境变量
    if (!uri) {
      return res.status(500).json({
        success: false,
        error: 'MONGODB_URI 环境变量未设置',
        steps: [
          '1. 检查 Netlify 环境变量设置',
          '2. 确认变量名称为 MONGODB_URI',
          '3. 检查 .env.local 文件（本地开发）'
        ]
      });
    }

    // 解析连接字符串
    const match = uri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/);
    
    if (!match) {
      return res.status(500).json({
        success: false,
        error: '连接字符串格式错误',
        example: 'mongodb+srv://username:password@cluster0.xxx.mongodb.net/database',
        yourUri: uri.replace(/:[^:]*@/, ':***@') // 隐藏密码
      });
    }

    const [, username, password, cluster, database] = match;
    
    res.status(200).json({
      success: true,
      diagnosis: {
        hasUri: true,
        username: username,
        passwordLength: password.length,
        cluster: cluster,
        database: database,
        specialCharsInPassword: /[@#$%&+=]/.test(password),
        suggestions: [
          '1. 登录 MongoDB Atlas 确认用户名和密码正确',
          '2. 检查数据库用户权限',
          '3. 确认网络访问设置',
          '4. 如果密码有特殊字符，可能需要 URL 编码'
        ]
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
