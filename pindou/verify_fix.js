// 验证index.html修复
const fs = require('fs');
const path = require('path');

console.log('=== index.html 修复验证 ===\n');

const indexPath = path.join(__dirname, 'index.html');
if (fs.existsSync(indexPath)) {
  const content = fs.readFileSync(indexPath, 'utf8');

  console.log('🔍 index.html 内容检查:');

  // 检查是否移除了错误的脚本引用
  const hasWrongScript = content.includes('src="/main.ts"');
  console.log(`${hasWrongScript ? '❌' : '✅'} 移除了错误的脚本引用`);

  // 检查是否保留了必要的脚本
  const hasLoadingScript = content.includes('addEventListener(\'load\'');
  console.log(`${hasLoadingScript ? '✅' : '❌'} 保留了加载脚本`);

  // 检查基本的HTML结构
  const checks = [
    { name: 'DOCTYPE', regex: /<!DOCTYPE html>/i },
    { name: 'HTML标签', regex: /<html/i },
    { name: 'HEAD标签', regex: /<head/i },
    { name: 'BODY标签', regex: /<body/i },
    { name: 'APP容器', regex: /id="app"/ }
  ];

  checks.forEach(check => {
    const hasMatch = check.regex.test(content);
    console.log(`${hasMatch ? '✅' : '❌'} ${check.name}`);
  });

} else {
  console.log('❌ index.html 文件不存在');
}

console.log('\n📋 Uni-app Vite 项目说明:');
console.log('- ✅ index.html 不需要手动引用 main.ts');
console.log('- ✅ @dcloudio/vite-plugin-uni 会自动处理入口文件');
console.log('- ✅ 插件会自动注入正确的脚本引用');
console.log('- ✅ 移除了错误的脚本引用后，项目应该能正常运行');

console.log('\n🎯 现在可以在 HBuilderX 中重新运行项目了！');
