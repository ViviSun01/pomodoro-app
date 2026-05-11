# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Electron-based Pomodoro timer desktop app with flat illustration style UI.

## Commands

- `npm install` - Install dependencies (required after git clone)
- `npm start` - Run the application

## Architecture

```
main.js          - Electron main process (window management, tray, notifications)
preload.js       - Secure bridge between main and renderer
renderer.js      - Timer logic, state management, UI interactions
index.html       - App structure and SVG tomato icon
style.css        - Flat illustration style with warm color palette
```

Key patterns:
- Settings persist via localStorage keys: `pomodoro.*` (focusMinutes, shortBreakMinutes, etc.)
- Three modes: focus / shortBreak / longBreak with configurable durations
- Long break triggers after configurable number of focus sessions (default 4)