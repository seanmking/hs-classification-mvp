const { execSync } = require('child_process');

console.log('Force pushing database schema...');

try {
  // Use yes command to auto-confirm
  execSync('yes | npm run db:push', { 
    stdio: 'inherit',
    shell: true
  });
  console.log('✅ Database schema pushed successfully');
} catch (error) {
  console.error('❌ Error pushing database schema:', error.message);
  process.exit(1);
}