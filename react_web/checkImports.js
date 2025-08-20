const fs = require('fs');
const path = require('path');

const SRC_DIR = process.argv[2] || './src';
const exts = ['.ts', '.tsx', '.js', '.jsx', '.css'];

// 获取所有文件
function getFiles(dir) {
  let results = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(dirent => {
    const fullPath = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      results = results.concat(getFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  });
  return results;
}

// 检查文件是否存在（加扩展名）
function fileExists(filePath) {
  if (fs.existsSync(filePath)) return true;
  for (const ext of exts) {
    if (fs.existsSync(filePath + ext)) return true;
  }
  return false;
}

// 在 src 下搜索文件并返回相对路径
function findInSrc(fileName) {
  const allFiles = getFiles(SRC_DIR);
  for (const file of allFiles) {
    if (file.endsWith(fileName) || exts.some(ext => file.endsWith(fileName + ext))) {
      return './' + path.relative(process.cwd(), file).replace(/\\/g, '/');
    }
  }
  return null;
}

// 扫描文件并尝试修复导入
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const regex = /import\s+.*?from\s+['"](.*?)['"]/g;
  let match;
  let fixedImports = [];

  while ((match = regex.exec(content)) !== null) {
    const importPath = match[1];
    if (importPath.startsWith('.')) {
      const absPath = path.resolve(path.dirname(filePath), importPath);
      if (!fileExists(absPath)) {
        const fileName = path.basename(importPath);
        const suggestion = findInSrc(fileName);
        if (suggestion) {
          console.log(`✅ 修正建议: ${filePath} -> import from '${suggestion}'`);
          fixedImports.push({ original: importPath, fixed: suggestion });
        } else {
          console.warn(`❌ 无法解析: ${filePath} -> ${importPath}`);
        }
      }
    }
  }
  return fixedImports;
}

// 扫描所有文件
const allFiles = getFiles(SRC_DIR).filter(f => /\.(ts|tsx|js|jsx)$/.test(f));
allFiles.forEach(scanFile);

console.log('扫描完成');
