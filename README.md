# Deutsch A1

German A1 flashcard and exercise PWA. Vanilla JS + Vite, Tailwind CSS v4, lucide icons.

- **Cards**: Anki-style SM-2 spaced repetition (Again / Hard / Good / Easy), 10 new words a day, German audio from the device's best installed German voice.
- **Reverse cards**: once a word is known (3+ day interval), an English → German card unlocks; she types the answer (ä ö ü ß keys).
- **Exercises**: der/die/das, meaning, verbs · listening (word, numbers, times, prices) · sentence builder, gap fill · exam prep (introduce yourself, forms, speaking cards).
- **Progress**: streak, per-topic progress, Export/Import to move progress between iPhone and iPad.

Vocabulary comes from the Goethe-Institut *Start Deutsch 1* word list. Edit it in `src/data/a1.js`.

## Layout
```
index.html          app shell
src/app.js          UI, routing, exercises
src/srs.js          SM-2 scheduler
src/data/a1.js      vocabulary + verb tables
src/data/exam.js    Start Deutsch 1 practice: intro prompts, forms, speaking cards
src/answer.js       typed-answer checking, clock phrases, sentence tokens
src/style.css       Tailwind import + app styles (components layer)
public/             copied as-is: sw.js, manifest.json, icons/
tools/              test.mjs, make_icons.py
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
