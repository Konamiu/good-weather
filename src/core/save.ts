// 进度：备忘录条目解锁 + 显影收藏
const KEY = 'good-weather-save-v1'

interface SaveData {
  unlocked: number // 已解锁章节数（备忘录可点条目）
  found: string[] // 已显影的真实素材id
}

export class Save {
  data: SaveData

  constructor() {
    try {
      this.data = JSON.parse(localStorage.getItem(KEY) || '') as SaveData
    } catch {
      this.data = { unlocked: 1, found: [] }
    }
  }

  private persist() {
    localStorage.setItem(KEY, JSON.stringify(this.data))
  }

  unlock(chapter: number) {
    if (chapter + 1 > this.data.unlocked) {
      this.data.unlocked = chapter + 1
      this.persist()
    }
  }

  find(id: string) {
    if (!this.data.found.includes(id)) {
      this.data.found.push(id)
      this.persist()
    }
  }
}
