/**
 * 测试文件上传自动Git commit功能
 * 验证上传的文件能够被git clone获取
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const API_URL = 'http://localhost:4000/api';
const TEST_USERNAME = 'jia';
const TEST_PASSWORD = 'Jia123456';

let authToken = '';
let projectId = '';
let branchId = '';

// 1. 登录获取token
async function login() {
  console.log('\n🔐 Step 1: 登录获取token...');
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      usernameOrEmail: TEST_USERNAME,
      password: TEST_PASSWORD,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`登录失败: ${response.statusText}\n${errorText}`);
  }

  const data = await response.json();
  console.log('📋 登录响应数据:', JSON.stringify(data, null, 2));
  authToken = data.access_token || data.accessToken || data.token;
  console.log('✅ 登录成功，获取到token');
  console.log(`📋 Token (前20字符): ${authToken ? authToken.substring(0, 20) + '...' : 'EMPTY'}`);
}

// 2. 创建测试项目
async function createProject() {
  console.log('\n📂 Step 2: 创建测试项目...');
  if (!authToken) {
    throw new Error('Token为空，无法创建项目');
  }
  console.log(`🔐 使用Token: ${authToken.substring(0, 20)}...`);

  const response = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      name: `Test Upload Commit ${Date.now()}`,
      description: 'Test file upload with automatic Git commit',
      visibility: 'PRIVATE',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`创建项目失败: ${response.statusText}\n${errorText}`);
  }

  const data = await response.json();
  projectId = data.id;
  console.log(`✅ 项目创建成功，ID: ${projectId}`);
}

// 3. 初始化Repository（如果尚未初始化）
async function initRepository() {
  console.log('\n🔧 Step 3: 检查Repository状态...');

  // 先检查Repository是否已存在
  try {
    const checkResponse = await fetch(`${API_URL}/projects/${projectId}/repository`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (checkResponse.ok) {
      console.log('✅ Repository已存在，跳过初始化');
      return;
    }
  } catch (error) {
    // 404错误说明Repository不存在，继续初始化
  }

  console.log('🔧 初始化Repository...');
  const response = await fetch(`${API_URL}/projects/${projectId}/repository`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    // 如果是Conflict错误，说明Repository已存在，不算失败
    if (response.status === 409) {
      console.log('⚠️ Repository已存在（Conflict），继续执行');
      return;
    }
    throw new Error(`初始化Repository失败: ${response.statusText}\n${errorText}`);
  }

  console.log('✅ Repository初始化成功');

  // 等待初始化完成
  await new Promise(resolve => setTimeout(resolve, 2000));
}

// 4. 获取默认分支ID
async function getBranchId() {
  console.log('\n🌿 Step 4: 获取默认分支ID...');
  const response = await fetch(`${API_URL}/projects/${projectId}/repository/branches`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`获取分支失败: ${response.statusText}`);
  }

  const branches = await response.json();
  const mainBranch = branches.find(b => b.name === 'main');

  if (!mainBranch) {
    throw new Error('未找到main分支');
  }

  branchId = mainBranch.id;
  console.log(`✅ 找到main分支，ID: ${branchId}`);
}

// 5. 上传测试文件
async function uploadTestFile() {
  console.log('\n📤 Step 5: 上传测试文件...');

  const testFileContent = `# Test File\n\nThis is a test file to verify Git commit functionality.\nUploaded at: ${new Date().toISOString()}\n`;
  const blob = new Blob([testFileContent], { type: 'text/plain' });

  const formData = new FormData();
  formData.append('file', blob, 'test-readme.md');
  formData.append('path', 'test-readme.md');  // 注意：字段名是 'path' 不是 'filePath'

  const response = await fetch(`${API_URL}/projects/${projectId}/repository/branches/${branchId}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`上传文件失败: ${response.statusText}\n${errorText}`);
  }

  const data = await response.json();
  console.log('✅ 文件上传成功:', data.path);
  console.log('📋 文件大小:', data.size, 'bytes');

  // 等待Git commit完成
  console.log('⏳ 等待Git commit处理...');
  await new Promise(resolve => setTimeout(resolve, 3000));
}

// 6. 验证Git提交历史
async function verifyCommitHistory() {
  console.log('\n📝 Step 6: 验证Git提交历史...');

  const response = await fetch(
    `${API_URL}/projects/${projectId}/repository/branches/${branchId}/commits?page=1&pageSize=10`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`获取commit历史失败: ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`✅ 找到 ${data.commits.length} 个commit:`);

  data.commits.forEach((commit, index) => {
    console.log(`   ${index + 1}. ${commit.message} (${commit.author.username})`);
  });

  const uploadCommit = data.commits.find(c => c.message.includes('Upload'));
  if (uploadCommit) {
    console.log('\n✅ 找到文件上传的commit!');
    console.log(`   Commit ID: ${uploadCommit.id}`);
    console.log(`   Message: ${uploadCommit.message}`);
    console.log(`   Author: ${uploadCommit.author.username}`);
  } else {
    console.warn('\n⚠️ 警告: 未找到文件上传的commit');
  }
}

// 7. 尝试git clone（需要本地安装Git）
async function testGitClone() {
  console.log('\n🔄 Step 7: 测试git clone...');

  const cloneUrl = `http://localhost:4000/repo/${projectId}`;
  const cloneDir = path.join(__dirname, `test-clone-${Date.now()}`);

  try {
    console.log(`📥 Clone URL: ${cloneUrl}`);
    console.log(`📁 Clone目录: ${cloneDir}`);

    // 执行git clone
    execSync(`git clone ${cloneUrl} "${cloneDir}"`, {
      stdio: 'inherit',
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });

    console.log('\n✅ Git clone成功!');

    // 检查文件是否存在
    const testFilePath = path.join(cloneDir, 'test-readme.md');
    if (fs.existsSync(testFilePath)) {
      console.log('✅ 文件 test-readme.md 存在于克隆的仓库中!');
      const content = fs.readFileSync(testFilePath, 'utf-8');
      console.log('\n📄 文件内容:');
      console.log('─'.repeat(50));
      console.log(content);
      console.log('─'.repeat(50));
    } else {
      console.error('❌ 文件 test-readme.md 不存在于克隆的仓库中');
    }

    // 清理克隆目录
    console.log(`\n🧹 清理测试目录: ${cloneDir}`);
    fs.rmSync(cloneDir, { recursive: true, force: true });

  } catch (error) {
    console.error('❌ Git clone失败:', error.message);
    console.log('\n💡 提示: 确保本地已安装Git并添加到PATH环境变量');
  }
}

// 主函数
async function main() {
  console.log('🚀 开始测试文件上传自动Git commit功能\n');
  console.log('=' .repeat(60));

  try {
    await login();
    await createProject();
    await initRepository();
    await getBranchId();
    await uploadTestFile();
    await verifyCommitHistory();
    await testGitClone();

    console.log('\n' + '='.repeat(60));
    console.log('✅ 所有测试步骤完成!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行测试
main();
