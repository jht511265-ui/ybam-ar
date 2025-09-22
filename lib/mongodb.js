// lib/mongodb.js
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('请添加 MONGODB_URI 到环境变量');
}

// 安全地打印URI（隐藏密码）
console.log('MongoDB 配置检查:');
console.log('URI:', uri.replace(/:[^:]*@/, ':***@'));

const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect().catch(err => {
      console.error('MongoDB 连接失败:', err);
      throw err;
    });
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect().catch(err => {
    console.error('MongoDB 连接失败:', err);
    throw err;
  });
}

// 连接到 cluster0 数据库
export async function getDatabase() {
  try {
    const client = await clientPromise;
    const db = client.db('cluster0'); // 使用 cluster0 作为数据库名
    return db;
  } catch (error) {
    console.error('获取数据库连接失败:', error);
    throw error;
  }
}

export async function testConnection() {
  try {
    const client = await clientPromise;
    const db = client.db('cluster0');
    
    // 测试连接和数据库访问
    const collections = await db.listCollections().toArray();
    const result = await db.command({ ping: 1 });
    
    console.log('MongoDB 连接测试成功');
    console.log('数据库名: cluster0');
    console.log('集合数量:', collections.length);
    
    return { 
      success: true, 
      result,
      database: 'cluster0',
      collections: collections.length
    };
  } catch (error) {
    console.error('MongoDB 连接测试失败:', error);
    return { success: false, error: error.message };
  }
}

export default clientPromise;
