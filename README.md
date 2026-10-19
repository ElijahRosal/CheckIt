# CheckIt
# CheckIt

CheckIt is a human-powered image judgement app. Users can upload images, vote on whether an image feels AI-generated, and browse the community consensus.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Supabase connection

The app now connects to Supabase when these values exist in a local `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Find them in Supabase under **Project Settings → API**. Restart `npm run dev` after creating or changing `.env.local`.

Without those values, the app continues to use its local demo mode.

## Current MVP behavior

- Uploads are stored in browser `localStorage` so the demo works without authentication or a backend account.
- Votes are also stored locally and are currently anonymous.
- The app uses seeded sample images so the library is immediately usable.
- Supabase Auth is intentionally not wired up yet. Anonymous browser sessions are used to prevent duplicate votes from the same browser.
