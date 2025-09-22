// lib/mongodb.js
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('请添加 MONGODB_URI 到环境变量');
}

console.log('=== MongoDB 连接配置 ===');
console.log('URI 存在:', !!uri);

// 安全地显示连接信息（隐藏密码）
try {
  const match = uri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/);
  if (match) {
    console.log('用户名:', match[1]);
    console.log('集群地址:', match[3]);
    console.log('数据库名:', match[4]);
  }
} catch (e) {
  console.log('解析错误:', e.message);
}
console.log('========================');

// 使用现代配置（移除过时选项）
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

let client;
let clientPromise;

async function connectToMongoDB() {
  try {
    console.log('正在连接 MongoDB...');
    client = new MongoClient(uri, options);
    await client.connect();
    
    console.log('✅ MongoDB 服务器连接成功');
    return client;
  } catch (error) {
    console.error('❌ MongoDB 连接失败:');
    console.error('错误代码:', error.code);
    console.error('错误信息:', error.message);
    
    // 详细的认证错误分析
    if (error.code === 8000) {
      console.error('🔐 认证失败详细分析:');
      console.error('1. 检查 MongoDB Atlas 的用户名和密码');
      console.error('2. 确认在 Atlas 中创建了数据库用户（不是登录邮箱）');
      console.error('3. 用户权限应该是 "Read and write to any database"');
      console.error('4. 检查密码中的特殊字符是否需要 URL 编码');
      console.error('5. 确认网络访问已配置（添加 0.0.0.0/0 到 IP 白名单）');
    }
    
    throw error;
  }
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = connectToMongoDB();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = connectToMongoDB();
}

export async function getDatabase() {
  try {
    const client = await clientPromise;
    // 从连接字符串中提取数据库名
    const match = uri.match(/mongodb\+srv:\/\/[^/]+\/([^?]+)/);
    const dbName = match ? match[1] : 'ar_project';
    return client.db(dbName);
  } catch (error) {
    console.error('获取数据库失败:', error);
    throw error;
  }
}

export default clientPromise;
