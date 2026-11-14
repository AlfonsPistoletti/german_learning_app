# Deutsch A1

German A1 flashcard and exercise PWA. Vanilla JS + Vite, Tailwind CSS v4, lucide icons.

- **Cards**: Anki-style SM-2 spaced repetition (Again / Hard / Good / Easy), 10 new words a day, German audio from the device's best installed German voice.
- **Exercises**: der/die/das, meaning, verb conjugation.
- **Progress**: streak, per-topic progress, Export/Import to move progress between iPhone and iPad.

Vocabulary comes from the Goethe-Institut *Start Deutsch 1* word list. Edit it in `src/data/a1.js`.

## Layout
```
index.html          app shell
src/app.js          UI, routing, exercises
src/srs.js          SM-2 scheduler
src/data/a1.js      vocabulary + verb tables
src/style.css       Tailwind import + app styles (components layer)
public/             copied as-is: sw.js, manifest.json, icons/
tools/              test-srs.mjs, make_icons.py
```

## Develop
```
npm install
npm run dev -- --host   # dev server, also reachable from the iPhone on the same Wi-Fi
npm test                # scheduler + data self-check
npm run build           # -> dist/
npm run preview         # serve dist/ (the service worker only runs in the build)
```

## Deploy (GitHub Pages)
1. Push to GitHub, branch `main`.
2. Repo → Settings → Pages → Source: **GitHub Actions**.
3. Every push to `main` runs `.github/workflows/deploy.yml`: test, build, publish `dist/`.
4. On the iPhone, open `https://<user>.github.io/<repo>/` in **Safari** → Share → **Add to Home Screen**.
