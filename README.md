# Mystery Liquid Sort

A puzzle game where you sort colored liquids into bottles. Complete customer orders by filling bottles with a single color, then deliver them. Supports hidden layers, daily missions, and power-ups.

## Features

- **Adventure mode**: Progressive levels with increasing difficulty (more colors, hidden layers).
- **Quick play**: Choose difficulty (Easy / Medium / Hard / Expert) for a single run.
- **Daily missions**: Complete tasks (e.g. pour liquid, win levels, use items) to earn coins.
- **Power-ups**: Undo, shuffle, add empty bottle, reveal hidden layers (cost coins).
- **Settings**: Sound on/off, language (繁體中文 / English).

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)

## Run locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. Open the URL shown in the terminal (e.g. `http://localhost:5173`).

## Build and deploy

- Build for production:
  ```bash
  npm run build
  ```
- Preview the production build locally:
  ```bash
  npm run preview
  ```

Output is in `dist/`. Deploy the contents of `dist/` to any static host (e.g. Vercel, Netlify, GitHub Pages). The app uses hash routing (`#/`, `#/game`), so configure the host to serve `index.html` for all routes if needed.

## Tech stack

- React 18, TypeScript, Vite
- React Router (HashRouter)
- Tailwind CSS (via class names in JSX)
- Lucide React (icons)

## License

Private / unlicensed unless stated otherwise.
