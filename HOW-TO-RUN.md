# How to run EngineWorks Lab (no terminal needed)

Three ways, from simplest to most complete.

## 1. Just play a game right now — zero setup
Open the `web/games` folder and **double-click any game**, e.g. `dynamo.html`.
It opens in your web browser and is fully playable.

This is solo/offline play: no accounts, leaderboards, or ads (those need the
server in option 2 or 3). Tip: double-clicking `index.html` (the hub) won't
work this way — the hub needs the server — so open the game files directly.

## 2. Run the whole site on your computer — double-click to start
One-time setup: install **Node.js** (free) from https://nodejs.org — pick a
version numbered **22 or higher**.

Then just double-click the launcher for your computer:
- **Mac:** `Start EngineWorks Lab (Mac).command`
- **Windows:** `Start EngineWorks Lab (Windows).bat`

A small window opens and your browser goes to **http://localhost:8420** — the
full hub with accounts and leaderboards. Leave that window open while you play;
close it to stop the game.

(First time on Mac: if it says the file is from an unidentified developer,
right-click the file → **Open** → **Open**. You only do this once.)

## 3. Put it online so anyone can play — a real web link, no terminal ever
Deploy free from GitHub to Render:
1. Go to https://render.com and sign in with your GitHub account.
2. Click **New → Blueprint** and choose the **EngineWorks-Lab** repo.
3. Render reads the included `render.yaml` and configures everything — click
   **Apply**.
4. In a couple of minutes you get a public URL like
   `https://engineworks-lab.onrender.com` that you and players just open.

Note: the free plan wipes its database when the service restarts, so accounts
and scores are temporary. For permanent data, upgrade the instance and add a
disk (there's a commented example in `render.yaml`).
