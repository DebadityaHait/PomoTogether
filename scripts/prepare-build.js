// Script to prepare for EAS build by ensuring Firebase config is available
const fs = require('fs');
const path = require('path');

const configDir = path.join(__dirname, '../config');
const firebaseConfigPath = path.join(configDir, 'firebase.config.ts');
const firebaseConfigJsPath = path.join(configDir, 'firebase.config.js');

// Check if firebase.config.ts exists
if (fs.existsSync(firebaseConfigPath)) {
  console.log('Firebase config found, creating JS version for build compatibility...');
  
  // Read the TS file
  const configContent = fs.readFileSync(firebaseConfigPath, 'utf8');
  
  // Write as JS file (this will be picked up by Metro bundler)
  fs.writeFileSync(firebaseConfigJsPath, configContent);
  
  console.log('Created firebase.config.js successfully');
} else {
  console.error('Error: firebase.config.ts not found!');
  console.error('Please create this file before building.');
  process.exit(1);
}

console.log('Build preparation complete!'); 