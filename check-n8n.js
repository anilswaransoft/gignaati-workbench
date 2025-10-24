// Quick N8N Diagnostic Script
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('========== N8N DIAGNOSTIC ==========\n');

// Check if N8N is installed globally
console.log('1. Checking global N8N installation...');
try {
  const version = execSync('n8n --version', { encoding: 'utf8' }).trim();
  console.log('   ✅ N8N found globally:', version);
} catch (error) {
  console.log('   ❌ N8N not found globally');
}

// Check if N8N is installed locally
console.log('\n2. Checking local N8N installation...');
const localN8nPath = path.join(__dirname, 'node_modules', 'n8n', 'bin', 'n8n');
if (fs.existsSync(localN8nPath)) {
  console.log('   ✅ N8N found locally:', localN8nPath);
} else {
  console.log('   ❌ N8N not found in local node_modules');
}

// Check if npx can find N8N
console.log('\n3. Checking npx n8n...');
try {
  const version = execSync('npx n8n --version', { encoding: 'utf8', timeout: 10000 }).trim();
  console.log('   ✅ npx can run N8N:', version);
} catch (error) {
  console.log('   ❌ npx cannot run N8N');
}

// Check if port 5678 is in use
console.log('\n4. Checking if port 5678 is available...');
const net = require('net');
const server = net.createServer();
server.once('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('   ❌ Port 5678 is already in use!');
  }
});
server.once('listening', () => {
  console.log('   ✅ Port 5678 is available');
  server.close();
});
server.listen(5678);

// Check Node.js version
console.log('\n5. Checking Node.js version...');
console.log('   Node version:', process.version);
if (parseInt(process.version.slice(1)) >= 18) {
  console.log('   ✅ Node.js version is compatible (18+)');
} else {
  console.log('   ⚠️  Node.js version might be too old (need 18+)');
}

// Check npm version
console.log('\n6. Checking npm version...');
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log('   npm version:', npmVersion);
} catch (error) {
  console.log('   ❌ npm not found');
}

console.log('\n========== RECOMMENDATIONS ==========\n');
console.log('If N8N is not installed, run ONE of these:');
console.log('  1. npm install -g n8n          (Global installation)');
console.log('  2. npm install n8n             (Local installation)');
console.log('  3. Let npx handle it           (Auto-download on first run)');
console.log('\nIf port 5678 is in use:');
console.log('  - Close any running N8N instances');
console.log('  - Or change N8N_PORT in n8n-manager.js');
console.log('\n====================================\n');

