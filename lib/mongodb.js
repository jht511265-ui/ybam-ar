// lib/mongodb.js
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('请添加 MONGODB_URI 到环境变量');
}

console.log('正在配置 MongoDB 连接...');

const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10000,
};

let client;
let clientPromise;

async function connectToMongoDB() {
  try {
    client = new MongoClient(uri, options);
    await client.connect();
    
    console.log('✅ MongoDB 服务器连接成功');
    
    // 测试连接并列出所有数据库
    const adminDb = client.db().admin();
    const result = await adminDb.listDatabases();
    
    console.log('可用的数据库:');
    result.databases.forEach(db => {
      console.log(`- ${db.name} (大小: ${db.sizeOnDisk} bytes)`);
    });
    
    return client;
  } catch (error) {
    console.error('❌ MongoDB 连接失败:');
    console.error('错误代码:', error.code);
    console.error('错误信息:', error.message);
    
    if (error.code === 8000) {
      console.error('认证失败，请检查:');
      console.error('1. MongoDB Atlas 用户名和密码');
      console.error('2. 数据库用户权限');
      console.error('3. 网络访问设置');
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

// 获取数据库连接（自动检测或使用默认数据库）
export async function getDatabase(databaseName = null) {
  try {
    const client = await clientPromise;
    
    if (databaseName) {
      return client.db(databaseName);
    }
    
    // 尝试从连接字符串中提取数据库名
    const dbNameMatch = uri.match(/mongodb\+srv:\/\/[^/]+\/([^?]+)/);
    if (dbNameMatch && dbNameMatch[1]) {
      return client.db(dbNameMatch[1]);
    }
    
    // 使用默认数据库名
    return client.db('cluster0');
  } catch (error) {
    console.error('获取数据库失败:', error);
    throw error;
  }
}

// 测试连接和数据库
export async function testConnection() {
  try {
    const client = await clientPromise;
    const db = client.db();
    
    // 测试基本连接
    await db.admin().ping();
    
    // 尝试列出集合
    let collections = [];
    try {
      collections = await db.listCollections().toArray();
    } catch (e) {
      console.log('无法列出集合，数据库可能为空');
    }
    
    return {
      success: true,
      message: 'MongoDB 连接成功',
      database: db.databaseName,
      collections: collections.length,
      collectionNames: collections.map(c => c.name)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}

export default clientPromise;
