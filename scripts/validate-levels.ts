import { LevelLoader } from '../src/core/LevelLoader';

async function validateAllLevels(): Promise<void> {
  const loader = LevelLoader.getInstance();
  const results: { id: number; valid: boolean; error?: string }[] = [];

  for (let i = 1; i <= 15; i++) {
    try {
      const config = await loader.loadLevel(i);
      results.push({
        id: i,
        valid: config !== null,
        error: config === null ? '加载失败' : undefined,
      });
    } catch (error) {
      results.push({
        id: i,
        valid: false,
        error: String(error),
      });
    }
  }

  console.log('关卡验证结果：');
  console.table(results);

  const invalid = results.filter(r => !r.valid);
  if (invalid.length > 0) {
    console.error(`\n${invalid.length} 个关卡验证失败：`);
    invalid.forEach(r => console.error(`  关卡 ${r.id}: ${r.error}`));
    process.exit(1);
  } else {
    console.log('\n所有关卡验证通过！');
  }
}

validateAllLevels();
