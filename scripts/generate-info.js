// scripts/generate-info.js
const fs = require('fs');
const pkg = require('../package.json');

const info = {
  name: pkg.name,
  version: pkg.version,
  buildTime: new Date().toISOString(),
};

fs.writeFileSync('public/info.json', JSON.stringify(info, null, 2));
console.log('✅ Build info written to public/info.json');
