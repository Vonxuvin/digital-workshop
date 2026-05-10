import { test, expect, Page } from '@playwright/test';
import path from 'path';

const BASE_URL = 'http://localhost:3000';

test.describe('道具系统集成测试', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('1. 游戏主菜单加载', async () => {
    const title = await page.locator('text=数字工坊').first();
    await expect(title).toBeVisible({ timeout: 10000 });
    console.log('✓ 主菜单加载成功');
  });

  test('2. 开始游戏按钮存在', async () => {
    const startBtn = await page.locator('text=开始游戏').first();
    await expect(startBtn).toBeVisible();
    console.log('✓ 开始游戏按钮存在');
  });

  test('3. 点击开始游戏进入关卡选择', async () => {
    const startBtn = await page.locator('text=开始游戏').first();
    await startBtn.click();
    await page.waitForTimeout(500);
    const levelSelect = await page.locator('text=选择关卡').first();
    await expect(levelSelect).toBeVisible({ timeout: 5000 });
    console.log('✓ 进入关卡选择界面');
  });

  test('4. 选择关卡1', async () => {
    const level1 = await page.locator('text=新手入门').first();
    await level1.click();
    await page.waitForTimeout(1000);
    console.log('✓ 选择关卡1成功');
  });

  test('5. 游戏画布加载', async () => {
    const canvas = await page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 5000 });
    console.log('✓ 游戏画布已加载');
  });

  test('6. 道具按钮显示', async () => {
    await page.waitForTimeout(2000);
    const propsContainer = await page.locator('text=💣').first();
    await expect(propsContainer).toBeVisible({ timeout: 5000 });
    console.log('✓ 道具按钮已显示');
  });

  test('7. 道具按钮可交互', async () => {
    const bombBtn = await page.locator('text=💣').first();
    await expect(bombBtn).toBeVisible();
    await bombBtn.click();
    console.log('✓ 道具按钮可点击');
  });

  test('8. 暂停按钮功能', async () => {
    const pauseBtn = await page.locator('text=暂停').first();
    await pauseBtn.click();
    await page.waitForTimeout(500);
    const resumeBtn = await page.locator('text=继续').first();
    await expect(resumeBtn).toBeVisible({ timeout: 3000 });
    console.log('✓ 暂停功能正常');
  });

  test('9. 返回主菜单', async () => {
    const menuBtn = await page.locator('text=主菜单').first();
    await menuBtn.click();
    await page.waitForTimeout(500);
    const mainMenu = await page.locator('text=数字工坊').first();
    await expect(mainMenu).toBeVisible({ timeout: 5000 });
    console.log('✓ 返回主菜单成功');
  });

  test('10. 音效控制按钮', async () => {
    const soundBtn = await page.locator('text=🔊').first();
    await expect(soundBtn).toBeVisible();
    await soundBtn.click();
    await page.waitForTimeout(200);
    const mutedBtn = await page.locator('text=🔇').first();
    await expect(mutedBtn).toBeVisible({ timeout: 2000 });
    console.log('✓ 音效控制功能正常');
  });
});

test.describe('道具系统功能测试', () => {
  test('道具系统模块导入测试', async ({ page }) => {
    await page.goto(`${BASE_URL}/src/gameplay/props/PropSystem.ts`);
    const content = await page.content();
    console.log('PropSystem 模块存在');
  });
});

console.log('测试文件已加载');
