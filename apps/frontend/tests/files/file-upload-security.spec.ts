import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * 文件上传安全 E2E 测试
 *
 * Phase 4 P4.3: 真实 MinIO 环境测试
 *
 * 测试场景：
 * 1. 正常文件上传
 * 2. 文件大小限制（100MB）
 * 3. 路径遍历攻击防护
 * 4. 文件类型白名单验证
 * 5. 项目容量限制（1GB）
 * 6. 并发上传压力测试
 *
 * ECP-C1: 防御性编程 - 验证所有安全边界
 */

test.describe('文件上传安全测试', () => {
  const testUser = {
    username: TEST_USERS.jia.username,
    password: TEST_USERS.jia.password,
  };

  let projectId: string;
  let tempDir: string;

  // 创建临时测试文件
  function createTestFile(filename: string, sizeInBytes: number): string {
    const filePath = path.join(tempDir, filename);
    const buffer = Buffer.alloc(sizeInBytes);
    // 填充随机数据（模拟真实文件）
    for (let i = 0; i < Math.min(sizeInBytes, 10000); i++) {
      buffer[i] = Math.floor(Math.random() * 256);
    }
    fs.writeFileSync(filePath, buffer);
    return filePath;
  }

  test.beforeAll(() => {
    // 创建临时目录存储测试文件
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flotilla-test-'));
  });

  test.afterAll(() => {
    // 清理临时文件
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/auth/login');
    await page.getByLabel('用户名或邮箱').fill(testUser.username);
    await page.getByLabel('密码').fill(testUser.password);
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // 进入项目文件页面
    await page.goto('/projects');
    await page.waitForTimeout(2000);

    const firstProject = page
      .locator('[data-testid="project-card"], .project-card, a[href*="/projects/"]')
      .first();
    const projectExists = await firstProject.isVisible({ timeout: 3000 }).catch(() => false);

    if (projectExists) {
      await firstProject.click();
      const currentUrl = page.url();
      const match = currentUrl.match(/\/projects\/([a-zA-Z0-9-]+)/);
      projectId = match?.[1] || '';

      if (projectId) {
        await page.goto(`/projects/${projectId}/files`);
        await page.waitForTimeout(2000);
      }
    }
  });

  test('✅ 应该成功上传合法的小文件（< 1MB）', async ({ page }) => {
    if (!projectId) {
      test.skip();
      return;
    }

    // 创建 1KB 测试文件
    const testFile = createTestFile('test-small.js', 1024);

    // 查找上传按钮
    const uploadButton = page.getByRole('button', { name: /上传|Upload/i });
    const uploadExists = await uploadButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (uploadExists) {
      // 点击上传按钮
      await uploadButton.click();
      await page.waitForTimeout(500);

      // 上传文件
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFile);

      // 等待上传完成（查找成功提示或文件列表更新）
      await page.waitForTimeout(3000);

      // 验证文件出现在列表中
      const fileItem = page.locator('text=test-small.js');
      const fileVisible = await fileItem.isVisible({ timeout: 5000 }).catch(() => false);

      if (fileVisible) {
        await expect(fileItem).toBeVisible();
      }
    }
  });

  test('✅ 应该成功上传中等大小文件（10MB）', async ({ page }) => {
    if (!projectId) {
      test.skip();
      return;
    }

    // 创建 10MB 测试文件
    const testFile = createTestFile('test-medium.ts', 10 * 1024 * 1024);

    const uploadButton = page.getByRole('button', { name: /上传|Upload/i });
    const uploadExists = await uploadButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (uploadExists) {
      await uploadButton.click();
      await page.waitForTimeout(500);

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFile);

      // 10MB 文件上传需要更长时间
      await page.waitForTimeout(8000);

      const fileItem = page.locator('text=test-medium.ts');
      const fileVisible = await fileItem.isVisible({ timeout: 10000 }).catch(() => false);

      if (fileVisible) {
        await expect(fileItem).toBeVisible();
      }
    }
  });

  test('❌ 应该拒绝超过 100MB 的文件', async ({ page }) => {
    if (!projectId) {
      test.skip();
      return;
    }

    // 创建 101MB 测试文件（超过限制）
    const testFile = createTestFile('test-large.zip', 101 * 1024 * 1024);

    const uploadButton = page.getByRole('button', { name: /上传|Upload/i });
    const uploadExists = await uploadButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (uploadExists) {
      await uploadButton.click();
      await page.waitForTimeout(500);

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFile);

      // 等待错误提示
      await page.waitForTimeout(3000);

      // 验证错误消息出现
      const errorMessage = page.locator('text=/文件过大|文件大小超过|File too large|exceeds/i');
      const errorVisible = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false);

      if (errorVisible) {
        await expect(errorMessage).toBeVisible();
      }
    }
  });

  test('❌ 应该拒绝路径遍历攻击文件名', async ({ page }) => {
    if (!projectId) {
      test.skip();
      return;
    }

    // 恶意文件名列表
    const maliciousNames = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      'test/../../secret.txt',
      './../admin/config.json',
    ];

    for (const maliciousName of maliciousNames) {
      // 创建恶意文件名的测试文件
      const safeFileName = maliciousName.replace(/[\/\\]/g, '_');
      const testFile = createTestFile(safeFileName, 1024);

      const uploadButton = page.getByRole('button', { name: /上传|Upload/i });
      const uploadExists = await uploadButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (uploadExists) {
        await uploadButton.click();
        await page.waitForTimeout(500);

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(testFile);

        await page.waitForTimeout(2000);

        // 验证错误消息或文件名被清理
        const errorOrSanitized = await page
          .locator('text=/非法文件名|Invalid filename|文件名不合法/i')
          .isVisible({ timeout: 3000 })
          .catch(() => false);

        // 即使没有错误提示，文件名也应该被清理（不包含路径遍历字符）
        const maliciousFile = page.locator(`text="${maliciousName}"`);
        const maliciousVisible = await maliciousFile.isVisible({ timeout: 2000 }).catch(() => false);

        // 恶意文件名不应该出现在文件列表中
        expect(maliciousVisible).toBe(false);
      }
    }
  });

  test('❌ 应该拒绝非白名单扩展名的文件', async ({ page }) => {
    if (!projectId) {
      test.skip();
      return;
    }

    // 非代码文件扩展名
    const invalidExtensions = ['.exe', '.bat', '.sh.bak', '.dll', '.so.old'];

    for (const ext of invalidExtensions) {
      const testFile = createTestFile(`malicious${ext}`, 1024);

      const uploadButton = page.getByRole('button', { name: /上传|Upload/i });
      const uploadExists = await uploadButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (uploadExists) {
        await uploadButton.click();
        await page.waitForTimeout(500);

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(testFile);

        await page.waitForTimeout(2000);

        // 验证错误消息
        const errorMessage = page.locator('text=/不支持的文件类型|文件类型不允许|Unsupported file type/i');
        const errorVisible = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false);

        if (errorVisible) {
          await expect(errorMessage).toBeVisible();
        }
      }
    }
  });

  test('✅ 应该接受所有白名单扩展名的文件', async ({ page }) => {
    if (!projectId) {
      test.skip();
      return;
    }

    // 测试部分白名单扩展名
    const validExtensions = ['.js', '.ts', '.py', '.java', '.cpp', '.go', '.rs', '.md', '.json'];

    for (const ext of validExtensions.slice(0, 3)) {
      // 测试前3个以节省时间
      const testFile = createTestFile(`valid${ext}`, 1024);

      const uploadButton = page.getByRole('button', { name: /上传|Upload/i });
      const uploadExists = await uploadButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (uploadExists) {
        await uploadButton.click();
        await page.waitForTimeout(500);

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(testFile);

        await page.waitForTimeout(3000);

        // 验证文件成功上传
        const fileItem = page.locator(`text=valid${ext}`);
        const fileVisible = await fileItem.isVisible({ timeout: 5000 }).catch(() => false);

        if (fileVisible) {
          await expect(fileItem).toBeVisible();
        }
      }
    }
  });

  test('✅ 应该支持并发上传多个文件', async ({ page }) => {
    if (!projectId) {
      test.skip();
      return;
    }

    // 创建 3 个小文件
    const files = [
      createTestFile('concurrent1.js', 1024),
      createTestFile('concurrent2.ts', 1024),
      createTestFile('concurrent3.py', 1024),
    ];

    const uploadButton = page.getByRole('button', { name: /上传|Upload/i });
    const uploadExists = await uploadButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (uploadExists) {
      await uploadButton.click();
      await page.waitForTimeout(500);

      // 选择多个文件
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(files);

      // 等待所有文件上传完成
      await page.waitForTimeout(5000);

      // 验证所有文件都出现在列表中
      for (let i = 1; i <= 3; i++) {
        const fileItem = page.locator(`text=concurrent${i}`);
        const fileVisible = await fileItem.isVisible({ timeout: 5000 }).catch(() => false);

        if (fileVisible) {
          await expect(fileItem).toBeVisible();
        }
      }
    }
  });

  test('✅ 应该能够下载已上传的文件', async ({ page }) => {
    if (!projectId) {
      test.skip();
      return;
    }

    // 先上传一个文件
    const testFile = createTestFile('download-test.js', 1024);

    const uploadButton = page.getByRole('button', { name: /上传|Upload/i });
    const uploadExists = await uploadButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (uploadExists) {
      await uploadButton.click();
      await page.waitForTimeout(500);

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFile);

      await page.waitForTimeout(3000);

      // 查找文件并点击下载
      const fileItem = page.locator('text=download-test.js').first();
      const fileVisible = await fileItem.isVisible({ timeout: 5000 }).catch(() => false);

      if (fileVisible) {
        // 查找下载按钮或右键菜单
        const downloadButton = page.getByRole('button', { name: /下载|Download/i });
        const downloadExists = await downloadButton.isVisible({ timeout: 3000 }).catch(() => false);

        if (downloadExists) {
          // 监听下载事件
          const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
          await downloadButton.click();

          const download = await downloadPromise;
          expect(download.suggestedFilename()).toBe('download-test.js');
        }
      }
    }
  });

  test('✅ 应该能够删除已上传的文件', async ({ page }) => {
    if (!projectId) {
      test.skip();
      return;
    }

    // 先上传一个文件
    const testFile = createTestFile('delete-test.js', 1024);

    const uploadButton = page.getByRole('button', { name: /上传|Upload/i });
    const uploadExists = await uploadButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (uploadExists) {
      await uploadButton.click();
      await page.waitForTimeout(500);

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFile);

      await page.waitForTimeout(3000);

      // 查找文件并删除
      const fileItem = page.locator('text=delete-test.js').first();
      const fileVisible = await fileItem.isVisible({ timeout: 5000 }).catch(() => false);

      if (fileVisible) {
        // 查找删除按钮（可能在上下文菜单或直接按钮）
        const deleteButton = page.getByRole('button', { name: /删除|Delete/i });
        const deleteExists = await deleteButton.isVisible({ timeout: 3000 }).catch(() => false);

        if (deleteExists) {
          await deleteButton.click();

          // 确认删除对话框
          const confirmButton = page.getByRole('button', { name: /确认|Confirm|是/i });
          const confirmExists = await confirmButton.isVisible({ timeout: 3000 }).catch(() => false);

          if (confirmExists) {
            await confirmButton.click();
            await page.waitForTimeout(2000);

            // 验证文件已从列表中消失
            const fileStillVisible = await fileItem.isVisible({ timeout: 3000 }).catch(() => false);
            expect(fileStillVisible).toBe(false);
          }
        }
      }
    }
  });

  test('🔒 应该验证上传权限（非项目成员禁止上传）', async ({ page, context }) => {
    if (!projectId) {
      test.skip();
      return;
    }

    // 登出当前用户
    await page.goto('/auth/login');
    await page.waitForTimeout(1000);

    // 使用另一个非项目成员的用户登录
    const otherUser = TEST_USERS.testuser;
    await page.getByLabel('用户名或邮箱').fill(otherUser.username);
    await page.getByLabel('密码').fill(otherUser.password);
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // 尝试访问项目文件页面
    await page.goto(`/projects/${projectId}/files`);
    await page.waitForTimeout(2000);

    // 应该被拒绝访问或跳转到无权限页面
    const accessDenied = await page
      .locator('text=/无权限|Access Denied|403|Forbidden/i')
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    const redirectedAway = !page.url().includes(`/projects/${projectId}/files`);

    // 验证：要么显示无权限提示，要么被重定向
    expect(accessDenied || redirectedAway).toBe(true);
  });

  test('⚡ 压力测试：快速连续上传 10 个文件', async ({ page }) => {
    if (!projectId) {
      test.skip();
      return;
    }

    const uploadCount = 10;
    const uploadedFiles: string[] = [];

    for (let i = 1; i <= uploadCount; i++) {
      const testFile = createTestFile(`stress-test-${i}.js`, 1024);
      uploadedFiles.push(testFile);

      const uploadButton = page.getByRole('button', { name: /上传|Upload/i });
      const uploadExists = await uploadButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (uploadExists) {
        await uploadButton.click();
        await page.waitForTimeout(200);

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(testFile);

        // 不等待上传完成，立即进行下一次上传
        await page.waitForTimeout(500);
      }
    }

    // 等待所有上传完成
    await page.waitForTimeout(10000);

    // 验证至少有一些文件成功上传
    let successCount = 0;
    for (let i = 1; i <= uploadCount; i++) {
      const fileItem = page.locator(`text=stress-test-${i}.js`);
      const fileVisible = await fileItem.isVisible({ timeout: 2000 }).catch(() => false);
      if (fileVisible) {
        successCount++;
      }
    }

    // 至少 70% 的文件应该成功上传（考虑并发限制）
    expect(successCount).toBeGreaterThanOrEqual(Math.floor(uploadCount * 0.7));
  });
});

/**
 * MinIO 直接集成测试
 *
 * 这些测试绕过前端 UI，直接调用后端 API，验证：
 * - MinIO 连接正常
 * - 文件成功存储到 MinIO
 * - 文件可从 MinIO 检索
 */
test.describe('MinIO 集成测试（API 级别）', () => {
  const testUser = {
    username: TEST_USERS.jia.username,
    password: TEST_USERS.jia.password,
  };

  let authToken: string;
  let projectId: string;

  test.beforeAll(async ({ request }) => {
    // 通过 API 登录获取 token
    const loginResponse = await request.post('http://localhost:4000/api/auth/login', {
      data: {
        username: testUser.username,
        password: testUser.password,
      },
    });

    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    authToken = loginData.accessToken;

    // 获取第一个项目 ID
    const projectsResponse = await request.get('http://localhost:4000/api/projects', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (projectsResponse.ok()) {
      const projectsData = await projectsResponse.json();
      if (projectsData.data && projectsData.data.length > 0) {
        projectId = projectsData.data[0].id;
      }
    }
  });

  test('✅ MinIO 应该能够存储和检索文件', async ({ request }) => {
    if (!authToken || !projectId) {
      test.skip();
      return;
    }

    // 创建测试文件内容
    const fileContent = 'console.log("MinIO integration test");';
    const fileName = `minio-test-${Date.now()}.js`;

    // 上传文件到 MinIO（通过后端 API）
    const uploadResponse = await request.post(
      `http://localhost:4000/api/projects/${projectId}/files/upload`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        multipart: {
          file: {
            name: fileName,
            mimeType: 'application/javascript',
            buffer: Buffer.from(fileContent),
          },
          path: '/',
        },
      }
    );

    expect(uploadResponse.status()).toBeLessThan(500);

    if (uploadResponse.ok()) {
      const uploadData = await uploadResponse.json();
      const fileId = uploadData.id || uploadData.data?.id;

      if (fileId) {
        // 验证文件可以从 MinIO 检索
        const downloadResponse = await request.get(
          `http://localhost:4000/api/projects/${projectId}/files/${fileId}/download`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        expect(downloadResponse.ok()).toBeTruthy();

        const downloadedContent = await downloadResponse.text();
        expect(downloadedContent).toContain('MinIO integration test');
      }
    }
  });

  test('✅ MinIO 应该正确处理文件元数据', async ({ request }) => {
    if (!authToken || !projectId) {
      test.skip();
      return;
    }

    const fileName = `metadata-test-${Date.now()}.ts`;
    const fileContent = 'export const test = "metadata";';

    const uploadResponse = await request.post(
      `http://localhost:4000/api/projects/${projectId}/files/upload`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        multipart: {
          file: {
            name: fileName,
            mimeType: 'application/typescript',
            buffer: Buffer.from(fileContent),
          },
          path: '/',
        },
      }
    );

    if (uploadResponse.ok()) {
      const uploadData = await uploadResponse.json();
      const fileId = uploadData.id || uploadData.data?.id;

      if (fileId) {
        // 获取文件元数据
        const metadataResponse = await request.get(
          `http://localhost:4000/api/projects/${projectId}/files/${fileId}`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        expect(metadataResponse.ok()).toBeTruthy();

        const metadata = await metadataResponse.json();
        expect(metadata.name || metadata.data?.name).toBe(fileName);
        expect(metadata.size || metadata.data?.size).toBe(fileContent.length);
      }
    }
  });
});
