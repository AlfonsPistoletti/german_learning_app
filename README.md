# Deutsch A1

German A1 flashcard and exercise PWA. Vanilla JS + Vite, Tailwind CSS v4, lucide icons.

- **Cards**: Anki-style SM-2 spaced repetition (Again / Hard / Good / Easy), 10 new words a day, German audio from pre-generated neural voice clips (Microsoft *Christoph*), device voice as fallback.
- **Reverse cards**: once a word is known (3+ day interval), an English → German card unlocks; she types the answer (ä ö ü ß keys).
- **Exercises**: der/die/das, meaning, verbs · listening (announcements & messages, word, numbers, times, prices) · sentence builder, gap fill · exam prep (introduce yourself, forms, speaking cards).
- **Progress**: streak, per-topic progress, Export/Import to move progress between iPhone and iPad.

Vocabulary comes from the Goethe-Institut *Start Deutsch 1* word list. Edit it in `src/data/a1.js`.

## Layout
```
index.html          app shell
src/app.js          UI, routing, exercises
src/srs.js          SM-2 scheduler
src/data/a1.js      vocabulary + verb tables
src/data/exam.js    Start Deutsch 1 practice: intro prompts, forms, speaking cards
src/data/hoeren.js  listening templates + fixed seeded pool
src/spoken.js       every text the app reads aloud (input for the audio clips)
src/answer.js       typed-answer checking, clock phrases, clip ids
src/style.css       Tailwind import + app styles (components layer)
public/             copied as-is: sw.js, manifest.json, icons/, audio/ (generated clips)
tools/              test.mjs, make-audio.mjs, make_icons.py
```

## Develop
```
npm install
npm run dev -- --host   # dev server, also reachable from the iPhone on the same Wi-Fi
npm test                # scheduler + data self-check
npm run build           # -> dist/
npm run preview         # serve dist/ (the service worker only runs in the build)
```

## Audio clips
Spoken text plays from `public/audio/<id>.mp3`, generated with [edge-tts](https://github.com/rany2/edge-tts)
(free, unofficial access to Microsoft's neural voices). Texts without a clip (prices, numbers > 100,
her own intro answers) use the device voice.

After changing words, sentences, speaking cards or listening templates, regenerate and commit the clips:
```
python -m pip install edge-tts   # once
npm run audio                    # only generates missing clips, deletes unused ones
```
Voice and speed: `VOICE` / `RATE` in `src/answer.js` (changing them regenerates everything).

## Deploy (GitHub Pages)
1. Push to GitHub, branch `main`.
2. Repo → Settings → Pages → Source: **GitHub Actions**.
3. Every push to `main` runs `.github/workflows/deploy.yml`: test, build, publish `dist/`.
4. On the iPhone, open `https://<user>.github.io/<repo>/` in **Safari** → Share → **Add to Home Screen**.
