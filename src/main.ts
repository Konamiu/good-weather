import { Game } from './core/engine'
import { loadAssets } from './core/assets'
import { TitleScene } from './scenes/title'

async function boot() {
  const game = new Game(document.getElementById('app')!)
  game.assets = await loadAssets()
  game.setScene(new TitleScene())
  game.start()
}

boot()
