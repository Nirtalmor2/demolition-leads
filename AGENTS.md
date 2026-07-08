<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Deployment to Vercel Production

1. Work on branch `Ver1.1` (the active development branch)
2. Before deploying, verify local build: `npx next build`
3. Force-push `Ver1.1` to `main`: `git push origin Ver1.1:main --force`
4. This triggers Vercel auto-deploy from the `main` branch
5. Check status: `npx vercel ls --prod`
6. Production URL: https://nirobnzpoc.vercel.app/

**Note:** Vercel Git integration is connected to `main`. The repo must remain public for the Git integration to work. If deployment shows `UNKNOWN` status, the repo was made private — make it public in GitHub settings.

**Dependencies note:** After code changes that add/remove npm packages, `package.json` and `package-lock.json` must be committed. The `maplibre-gl` package was removed — do not reinstall it.
