// 验证 H5 配置是否正确
const fs = require('fs');
const path = require('path');

console.log('=== H5 配置验证 ===\n');

const checks = [
  {
    name: 'package.json 依赖',
    check: () => {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const hasVue3 = pkg.dependencies.vue && pkg.dependencies.vue.includes('^3.');
      const hasUniH5 = pkg.dependencies['@dcloudio/uni-h5'];
      const hasVitePlugin = pkg.devDependencies['@dcloudio/vite-plugin-uni'];

      return hasVue3 && hasUniH5 && hasVitePlugin;
    }
  },
  {
    name: 'manifest.json H5 配置',
    check: () => {
      const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
      return manifest.h5 && manifest.h5.title && manifest.h5.template;
    }
  },
  {
    name: 'vite.config.ts 配置',
    check: () => {
      const viteConfig = fs.readFileSync('vite.config.ts', 'utf8');
      return viteConfig.includes('@dcloudio/vite-plugin-uni') &&
             viteConfig.includes('uni()');
    }
  },
  {
    name: 'main.ts Vue 3 支持',
    check: () => {
      const mainTs = fs.readFileSync('src/main.ts', 'utf8');
      return mainTs.includes('#ifdef VUE3') &&
             mainTs.includes('createSSRApp');
    }
  },
  {
    name: 'App.vue 路由配置',
    check: () => {
      const appVue = fs.readFileSync('src/App.vue', 'utf8');
      return appVue.includes('<router-view') &&
             appVue.includes('<template>');
    }
  },
  {
    name: 'pages.json 配置',
    check: () => {
      const pages = JSON.parse(fs.readFileSync('pages.json', 'utf8'));
      return pages.pages && pages.pages.length > 0;
    }
  }
];

let allPassed = true;

checks.forEach(({name, check}) => {
  try {
    const passed = check();
    console.log(`${passed ? '✅' : '❌'} ${name}`);
    if (!passed) allPassed = false;
  } catch (e) {
    console.log(`❌ ${name} - 错误: ${e.message}`);
    allPassed = false;
  }
});

console.log('\n=== 诊断结果 ===');
if (allPassed) {
  console.log('✅ 所有配置检查通过！H5 环境应该可以正常工作。');
  console.log('\n📋 下一步操作：');
  console.log('1. 重新启动 HBuilderX');
  console.log('2. 运行 → 运行到浏览器 → Chrome');
  console.log('3. 如果仍有问题，检查 HBuilderX 控制台的编译错误');
} else {
  console.log('❌ 部分配置存在问题，请检查上述 ❌ 项。');
  console.log('\n🔧 常见修复方法：');
  console.log('1. 确保 package.json 使用 Vue 3 和新版 Uni-app 依赖');
  console.log('2. 检查 manifest.json 包含 h5 配置块');
  console.log('3. 确认 vite.config.ts 使用正确的插件');
  console.log('4. 验证 main.ts 支持 Vue 3');
  console.log('5. 确保 App.vue 包含 <router-view>');
}

console.log('\n🎯 运行调试：');
console.log('python3 -m http.server 8080 --bind 127.0.0.1');
console.log('然后访问: http://127.0.0.1:8080/debug_page.html');
