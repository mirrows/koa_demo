// 自搭建的一个缓存机制
class Cache {
  constructor() {
    this.map = {};
    this.timeMap = {};
  }

  clear() {
    const nowKey = Date.now();
    if (this.lastClear === nowKey) {
      return;
    }
    const clearTime = Object.keys(this.timeMap).filter((v) => v <= nowKey);
    clearTime.forEach((timeKey) => {
      this.timeMap[timeKey].forEach((k) => {
        delete this.map[k];
      })
      delete this.timeMap[timeKey];
    })
    this.lastClear = nowKey;
  }

  get(key) {
    this.clear();
    return this.map[key];
  }

  set(key, value, time = 90) {
    this.clear();
    const timeKye = Date.now() + time * 60 * 1000;
    this.map[key] = value;
    this.timeMap[timeKye] = this.timeMap[timeKye] || [];
    this.timeMap[timeKye].push(key);
  }
}

module.exports = {
  Cache,
  curCache: new Cache(),
};