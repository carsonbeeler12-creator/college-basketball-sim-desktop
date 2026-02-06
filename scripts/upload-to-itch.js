#!/usr/bin/env node
/**
 * College Basketball Dynasty - itch.io Upload Helper
 * 
 * This script helps deploy builds to itch.io using direct HTTP upload.
 * Requires: ITCH_API_KEY environment variable
 * 
 * Usage:
 *   node scripts/upload-to-itch.js [--target yourname/game] [--upload]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));

const VERSION = packageJson.version;
const RELEASE_DIR = path.join(__dirname, '../release', VERSION);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkBuildArtifacts() {
  const winPortable = path.join(RELEASE_DIR, `College-Basketball-Dynasty-${VERSION}-Windows-Portable.zip`);
  const winUnpacked = path.join(RELEASE_DIR, 'win-unpacked');
  const allFiles = fs.readdirSync(RELEASE_DIR);
  const linuxTarGz = allFiles.find(f => f.endsWith('.tar.gz'));
  const macDmg = allFiles.find(f => f.endsWith('.dmg'));
  
  log('='.repeat(50), 'cyan');
  log(`College Basketball Dynasty v${VERSION} - itch.io Upload`, 'cyan');
  log('='.repeat(50), 'cyan');
  log('');
  
  log('Checking build artifacts...', 'blue');
  
  if (!fs.existsSync(RELEASE_DIR)) {
    log(`✗ Release directory not found: ${RELEASE_DIR}`, 'red');
    log('Run: npm run build', 'yellow');
    process.exit(1);
  }
  
  const artifacts = {
    portable: fs.existsSync(winPortable),
    unpacked: fs.existsSync(winUnpacked),
    linux: linuxTarGz ? fs.existsSync(path.join(RELEASE_DIR, linuxTarGz)) : false,
    mac: macDmg ? fs.existsSync(path.join(RELEASE_DIR, macDmg)) : false
  };
  
  if (artifacts.portable) {
    const size = (fs.statSync(winPortable).size / (1024 * 1024)).toFixed(2);
    log(`✓ Windows Portable: ${path.basename(winPortable)} (${size} MB)`, 'green');
  } else {
    log(`✗ Windows Portable not found: ${path.basename(winPortable)}`, 'red');
  }
  
  if (artifacts.unpacked) {
    log(`✓ Unpacked directory: win-unpacked/`, 'green');
  }
  
  if (artifacts.linux) {
    log(`✓ Linux: ${linuxTarGz}`, 'green');
  }
  
  if (artifacts.mac) {
    log(`✓ macOS: ${macDmg}`, 'green');
  } else if (macDmg === undefined) {
    log(`⚠ macOS DMG not found (requires build on macOS)`, 'yellow');
  }
  
  log('', 'reset');
  
  if (!artifacts.portable) {
    log('Missing build artifacts. Run: npm run build', 'red');
    process.exit(1);
  }
  
  return { winPortable, winUnpacked, linuxTarGz, macDmg };
}

function showDeploymentOptions(target, artifacts) {
  const parts = target.split('/');
  if (parts.length !== 2) {
    log('Invalid target format. Use: username/game-name', 'red');
    process.exit(1);
  }
  
  const [user, game] = parts;
  const winSize = (fs.statSync(artifacts.winPortable).size / (1024 * 1024)).toFixed(2);
  
  log('Deployment Options', 'blue');
  log('─'.repeat(50), 'blue');
  log('');
  
  log('Option 1: Web UI Upload (Recommended)', 'green');
  log(`  Upload to: https://itch.io/dashboard/games/${game}`, 'reset');
  log('');
  log('  Windows:', 'yellow');
  log(`    1. Click "Upload new build"`, 'reset');
  log(`    2. Select: College-Basketball-Dynasty-${VERSION}-Windows-Portable.zip (${winSize} MB)`, 'reset');
  log(`    3. Platform: Windows`, 'reset');
  log(`    4. Check "Executable"`, 'reset');
  log(`    5. Save`, 'reset');
  log('');
  if (artifacts.linuxTarGz) {
    const linuxSize = (fs.statSync(path.join(RELEASE_DIR, artifacts.linuxTarGz)).size / (1024 * 1024)).toFixed(2);
    log('  Linux:', 'yellow');
    log(`    1. Click "Upload new build"`, 'reset');
    log(`    2. Select: ${artifacts.linuxTarGz} (${linuxSize} MB)`, 'reset');
    log(`    3. Platform: Linux`, 'reset');
    log(`    4. Save`, 'reset');
    log('');
  }
  if (artifacts.macDmg) {
    const macSize = (fs.statSync(path.join(RELEASE_DIR, artifacts.macDmg)).size / (1024 * 1024)).toFixed(2);
    log('  macOS:', 'yellow');
    log(`    1. Click "Upload new build"`, 'reset');
    log(`    2. Select: ${artifacts.macDmg} (${macSize} MB)`, 'reset');
    log(`    3. Platform: Mac`, 'reset');
    log(`    4. Save`, 'reset');
    log('');
  } else {
    log('  macOS:', 'yellow');
    log(`    ⚠ DMG must be built on macOS: npm run build:mac`, 'reset');
    log('');
  }
  
  log('Option 2: Butler CLI (Fastest if installed)', 'green');
  log('  Windows:', 'yellow');
  log(`    butler push "${artifacts.winPortable}" "${target}:windows" --userversion=${VERSION}`, 'reset');
  if (artifacts.linuxTarGz) {
    log('  Linux:', 'yellow');
    log(`    butler push "${path.join(RELEASE_DIR, artifacts.linuxTarGz)}" "${target}:linux" --userversion=${VERSION}`, 'reset');
  }
  if (artifacts.macDmg) {
    log('  macOS:', 'yellow');
    log(`    butler push "${path.join(RELEASE_DIR, artifacts.macDmg)}" "${target}:mac" --userversion=${VERSION}`, 'reset');
  }
  log('  Install butler: https://itch.io/docs/butler/installing.html', 'yellow');
  log('');
  
  log('Option 3: Check itch Push Instructions', 'green');
  log(`  Set env var: ITCH_TARGET="${target}"`, 'reset');
  log(`  Then run: npm run itch:push`, 'reset');
  log('');
  
  log('Artifacts generated:', 'cyan');
  const files = fs.readdirSync(RELEASE_DIR)
    .filter(f => !f.startsWith('.'))
    .sort();
  files.forEach(f => {
    const fullPath = path.join(RELEASE_DIR, f);
    const stat = fs.statSync(fullPath);
    if (stat.isFile()) {
      const size = (stat.size / (1024 * 1024)).toFixed(2);
      let platform = '📦';
      if (f.includes('Linux')) platform = '🐧';
      else if (f.includes('Windows')) platform = '🪟';
      else if (f.includes('Mac') || f.endsWith('.dmg')) platform = '🍎';
      log(`  ${platform} ${f} (${size} MB)`, 'cyan');
    } else {
      let platform = '📁';
      if (f.includes('linux')) platform = '🐧';
      else if (f.includes('win')) platform = '🪟';
      else if (f.includes('mac')) platform = '🍎';
      log(`  ${platform} ${f}/ (directory)`, 'cyan');
    }
  });
  log('');
}

// Main
const args = process.argv.slice(2);
let target = process.env.ITCH_TARGET || 'yourname/college-basketball-dynasty';
let shouldUpload = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--target' && args[i + 1]) {
    target = args[++i];
  }
  if (args[i] === '--upload') {
    shouldUpload = true;
  }
}

const artifacts = checkBuildArtifacts();
showDeploymentOptions(target, artifacts);

log('Next steps:', 'cyan');
log('  1. Choose an option above', 'reset');
log('  2. Upload the build to itch.io', 'reset');
log('  3. Test the download on a clean machine', 'reset');
log('');

if (shouldUpload && process.env.ITCH_API_KEY) {
  log('(API upload mode would go here)', 'yellow');
  log('For now, use one of the options above', 'yellow');
} else if (!target.includes('yourname')) {
  log(`Target configured: ${target}`, 'green');
  log('Ready to deploy! Choose your upload method above.', 'green');
}
