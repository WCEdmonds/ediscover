const fs = require('fs');
const path = require('path');

const versionFile = path.join(__dirname, 'public', 'version.json');

try {
  const currentVersion = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
  const [major, minor, patch] = currentVersion.version.split('.').map(Number);
  currentVersion.version = `${major}.${minor}.${patch + 1}`;
  fs.writeFileSync(versionFile, JSON.stringify(currentVersion, null, 2));
  console.log(`Version incremented to ${currentVersion.version}`);
} catch (error) {
  console.error('Error updating version:', error);
  process.exit(1);
}