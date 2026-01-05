import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.error('❌ REDIS_URL not found in .env');
  process.exit(1);
}

console.log('🔗 Connecting to Redis...');
console.log(`   URL: ${redisUrl.split('@')[1] || 'localhost'}`);

const client = createClient({
  url: redisUrl.replace('redis://', 'rediss://'),
  socket: {
    rejectUnauthorized: false
  }
});

client.on('error', (err) => {
  console.error('❌ Redis Connection Error:', err.message);
  process.exit(1);
});

client.on('connect', () => {
  console.log('✅ Redis Connected!');
});

try {
  await client.connect();
  console.log('✅ Client Connected Successfully');

  // Test: Write
  console.log('\n📝 Testing SET...');
  await client.set('wbtrade_test', 'Hello from WBTrade!');
  console.log('✅ SET successful');

  // Test: Read
  console.log('\n📖 Testing GET...');
  const value = await client.get('wbtrade_test');
  console.log(`✅ GET successful: "${value}"`);

  // Test: Delete
  console.log('\n🗑️ Testing DEL...');
  await client.del('wbtrade_test');
  console.log('✅ DEL successful');

  console.log('\n🎉 All Redis tests passed!');
  
  await client.disconnect();
  console.log('✅ Disconnected');
  process.exit(0);
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
