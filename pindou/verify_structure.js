// 验证项目结构和文件位置
const fs = require('fs');
const path = require('path');

console.log('=== PixelBead 项目结构验证 ===\n');

// 检查关键文件是否存在
const criticalFiles = [
  'src/main.ts',
  'src/App.vue',
  'src/pages/index/index.vue',
  'src/pages/editor/editor.vue',
  'index.html',
  'vite.config.ts',
  'tsconfig.json',
  'pages.json',
  'manifest.json'
];

console.log('📁 关键文件检查:');
criticalFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  const exists = fs.existsSync(fullPath);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
});

console.log('\n🔍 导入路径检查:');

// 检查main.ts的导入
const mainTsPath = path.join(__dirname, 'src/main.ts');
if (fs.existsSync(mainTsPath)) {
  const mainTsContent = fs.readFileSync(mainTsPath, 'utf8');
  console.log('✅ main.ts 存在');

  if (mainTsContent.includes('./App.vue')) {
    console.log('✅ main.ts 正确导入 App.vue');
  } else {
    console.log('❌ main.ts 导入 App.vue 失败');
  }
}

// 检查App.vue的导入
const appVuePath = path.join(__dirname, 'src/App.vue');
if (fs.existsSync(appVuePath)) {
  const appVueContent = fs.readFileSync(appVuePath, 'utf8');
  console.log('✅ App.vue 存在');

  if (appVueContent.includes('@/uni.scss')) {
    console.log('✅ App.vue 正确导入样式');
  }
}

// 检查页面文件的导入
const pages = ['src/pages/index/index.vue', 'src/pages/editor/editor.vue'];
pages.forEach(page => {
  const pagePath = path.join(__dirname, page);
  if (fs.existsSync(pagePath)) {
    const pageContent = fs.readFileSync(pagePath, 'utf8');
    console.log(`✅ ${page} 存在`);

    if (pageContent.includes('../types/') && pageContent.includes('../utils/')) {
      console.log(`✅ ${page} 导入路径正确`);
    } else {
      console.log(`⚠️ ${page} 导入路径可能有问题`);
    }
  }
});

console.log('\n📋 总结:');
console.log('- 所有关键文件应该都标记为 ✅');
console.log('- 如果有任何 ❌，请检查文件位置');
console.log('- 重新启动 HBuilderX 清除缓存');
console.log('- 然后重新运行项目');
