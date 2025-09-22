// lib/mongodb.js
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('请添加 MONGODB_URI 到环境变量');
}

console.log('MongoDB URI:', uri.replace(/:[^:]*@/, ':***@')); // 安全地打印URI（隐藏密码）

const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // 针对 Cluster0 的优化配置
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  // 开发模式
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect().catch(err => {
      console.error('MongoDB 连接失败:', err);
      throw err;
    });
  }
  clientPromise = global._mongoClientPromise;
} else {
  // 生产模式
  client = new MongoClient(uri, options);
  clientPromise = client.connect().catch(err => {
    console.error('MongoDB 连接失败:', err);
    throw err;
  });
}

// 测试连接函数
export async function testConnection() {
  try {
    const client = await clientPromise;
    const result = await client.db().admin().ping();
    console.log('MongoDB 连接测试成功');
    return { success: true, result };
  } catch (error) {
    console.error('MongoDB 连接测试失败:', error);
    return { success: false, error: error.message };
  }
}

export default clientPromise;
