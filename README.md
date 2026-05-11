# 番茄钟 Pomodoro

桌面番茄钟应用，基于 Electron 开发，采用扁平插画风格 UI。

## 功能

- 三种模式：专注 / 短休息 / 长休息
- 自定义各模式时长
- 每 N 次专注后进入长休息
- 自动开始选项
- 系统桌面通知
- 设置持久化

## 快速启动

```bash
cd pomodoro-app
npm install
npm start
```

## 项目结构

```
pomodoro-app/
├── main.js       # Electron 主进程
├── preload.js    # 预加载脚本（安全桥接）
├── renderer.js   # 计时逻辑与 UI 交互
├── index.html    # 页面结构
├── style.css     # 样式
└── CLAUDE.md     # Claude Code 指南
```