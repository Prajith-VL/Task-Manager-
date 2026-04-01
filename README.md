# TASK-MANAGER

A lightweight, deploy-ready static web app for daily productivity with separate feature pages.

## Features
- Multi-page app with shared UI and navigation
- Local persistence with `localStorage` (no backend required)
- Mobile-responsive layouts

## Pages
- `index.html` - Home (feature hub)
- `todo.html` - Todo manager
- `tracker.html` - Daily completion tracker (individual task goals)
- `fitness.html` - Fitness Master

## Feature Details
### Todo Manager
- Add, edit, delete tasks
- Mark complete/incomplete
- Priority and due dates
- Search and filter views
- Clear completed tasks
- Keyboard shortcut: `Ctrl + J` / `Cmd + J`

### Daily Completion
- Add/delete checkpoints
- Tick-box tracking per day
- Individual goal days per checkpoint
- Per-task progress and summary cards

### Fitness Master
- Add exercises with goal and unit
- Log reached value and notes (example: "Reached 30 pushups")
- Yesterday performance summary
- 7-day completion chart
- Extra insights: streak and best day

## Tech Stack
- HTML
- CSS
- Vanilla JavaScript
- Browser `localStorage`

## Project Structure
```text
.
+-- index.html
+-- todo.html
+-- tracker.html
+-- fitness.html
+-- styles.css
+-- common.js
+-- todo.js
+-- tracker.js
+-- fitness.js
+-- README.md
```

## Run Locally
### Option 1: Open directly
Open `index.html` in your browser.

### Option 2: Local server (recommended)
```powershell
npx serve .
```
Then open the URL shown in terminal.

## Free Deployment
### GitHub Pages (recommended)
1. Create a GitHub repository and push this project.
2. Go to `Settings -> Pages`.
3. Under `Build and deployment`, choose:
   - `Source: Deploy from a branch`
   - `Branch: main` and `/ (root)`
4. Save and wait for the site URL.

## Daily Use Notes
- Data is saved in your browser (`localStorage`).
- If you clear browser data, app data will be removed.
- For daily consistency, use the same browser/profile on your device.

## License
Personal use.
