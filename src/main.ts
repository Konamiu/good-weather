import { Game } from './core/engine'
import { loadAssets } from './core/assets'
import { TitleScene } from './scenes/title'

async function boot() {
  const game = new Game()
  await game.init(document.getElementById('app')!)
  game.assets = await loadAssets()
  game.setScene(new TitleScene())
  // 调试句柄（自动化测试用）
  ;(window as unknown as { game: Game }).game = game
}

boot()
