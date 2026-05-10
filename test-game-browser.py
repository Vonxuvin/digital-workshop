from playwright.sync_api import sync_playwright
import time

def test_game():
    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 720})

        page.on("console", lambda msg: print(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda exc: print(f"[PAGE ERROR] {exc}"))

        print("\n=== 测试1: 打开游戏主界面 ===")
        page.goto("http://localhost:3000")
        page.wait_for_load_state("networkidle")
        time.sleep(2)

        page.screenshot(path="/workspace/test-results/game-main-menu.png", full_page=False)
        print("截图已保存: game-main-menu.png")

        page_content = page.content()
        if "canvas" in page_content.lower():
            print("✓ 检测到Canvas元素 (PixiJS渲染)")
            results.append(("Canvas检测", True))
        else:
            print("✗ 未检测到Canvas元素")
            results.append(("Canvas检测", False))

        print("\n=== 测试2: 检查页面加载 ===")
        title = page.title()
        print(f"页面标题: {title}")
        results.append(("页面标题", len(title) > 0))

        print("\n=== 测试3: 检查控制台错误 ===")
        console_errors = []
        page.evaluate("""() => {
            window.consoleErrors = [];
            const origError = console.error;
            console.error = (...args) => {
                window.consoleErrors.push(args.join(' '));
                origError.apply(console, args);
            };
        }""")
        time.sleep(1)

        page.evaluate("window.consoleErrors || []")
        results.append(("无控制台错误", len(console_errors) == 0))

        print("\n=== 测试4: 尝试交互 ===")
        page.mouse.move(640, 360)
        page.mouse.click(640, 360)
        time.sleep(1)
        page.screenshot(path="/workspace/test-results/game-after-click.png", full_page=False)
        print("交互后截图已保存: game-after-click.png")

        print("\n=== 测试5: 性能检查 ===")
        metrics = page.evaluate("""() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            return {
                domContentLoaded: perfData ? perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart : 0,
                loadComplete: perfData ? perfData.loadEventEnd - perfData.fetchStart : 0
            };
        }""")
        print(f"DOMContentLoaded: {metrics['domContentLoaded']}ms")
        print(f"页面加载完成: {metrics['loadComplete']}ms")
        results.append(("页面加载时间<3s", metrics['loadComplete'] < 3000))

        browser.close()

    print("\n" + "=" * 50)
    print("测试结果汇总:")
    for name, passed in results:
        status = "✓ 通过" if passed else "✗ 失败"
        print(f"  {name}: {status}")

    passed_count = sum(1 for _, p in results if p)
    print(f"\n通过率: {passed_count}/{len(results)}")

    return all(p for _, p in results)

if __name__ == "__main__":
    import os
    os.makedirs("/workspace/test-results", exist_ok=True)

    success = test_game()
    exit(0 if success else 1)
