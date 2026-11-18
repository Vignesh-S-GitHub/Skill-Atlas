# SkillAtlas

Every place to find agent skills, in one search.

SkillAtlas is a curated directory of websites and GitHub repositories for discovering agent skills written in the SKILL.md format. It runs entirely in the browser using React, TypeScript, Vite, Tailwind CSS, and Fuse.js.

## Run locally

Use Node.js 22.12+ and npm.

```bash
npm ci
npm run dev
```

Open the URL printed by Vite. To build and serve the production version locally:

```bash
npm run build
npm run preview
```

The production build is in `dist/`. Serve that directory over HTTP to run the app.

## Use the directory

- Press **/** to focus search. Fuse.js searches names, descriptions, categories, tags and platforms. Every term must match, even when terms appear in different fields.
- Combine filters across groups. Multiple selections in the same group match any selection in that group. The topic shortcuts set the Focus filter.
- Save favorites with the heart. Export a Markdown list from the Favorites tab. Favorites and appearance are stored in the current browser.
- Select **Compare** on up to three cards, then open the Compare tab. The comparison table scrolls horizontally on narrow screens.
- Use **Search everywhere** for direct searches where supported, site-scoped web searches, and GitHub code search. GitHub may require sign-in to display code search results.

## Add or update a source

Edit `data/sites.json`. Add a unique stable `id`, a verified HTTPS `url`, and a short `summary` plus `bestFor`. Give the record a factual description, setup guide, pros and cons, source links, ISO dates in `addedAt` and `lastVerified`, and a favicon filename in `public/icons/`. Use an existing entry as a starting point. The full TypeScript interface and allowed filter values are in `src/catalog.ts`.

1. Use one of the four `type` labels. Use the filter strings defined in `filterOptions` for `focus`, `installMethod`, `features`, and `platforms`. An empty platform array means support varies by skill or was not documented for the source.
2. Set `searchUrlTemplate` to an HTTPS URL containing `{query}`. SkillAtlas percent-encodes the query before inserting it. Test a keyword and a multiword query. Use `searchKind: "native"` for a supported site search, `"github"` for a scoped GitHub search, or `"site"` for a web search restricted to the site.
3. Record only published stats that can be checked against a first-party page. Spell out what is being counted. For example, `{"skills":"~15k","categories":18}` describes SkillsMK, while mdskills.ai uses `listings` because its public count includes plugins and MCP servers.
4. Check the destination, search, and install links, along with the claims in the record. Update `lastVerified` after reviewing. Run `npm run build` and check the card, drawer, and external search link in the preview.

The starter catalog includes all ten requested destinations. Counts are publisher snapshots from November 18, 2026. Look in each drawer for the source links. **Community-vetted** identifies editorially selected or community-curated sources. Compatibility can vary by skill.

## Configure GitHub issue drafts

Enable Issues in the GitHub repository that should receive submissions. Copy `.env.example` to `.env.local` and set:

```dotenv
VITE_GITHUB_REPOSITORY=your-org/skillatlas
```

Restart Vite after editing the variable. The GitHub Pages workflow sets the variable to the repository where it runs. For another host, set the same variable before building. The forms open a prefilled GitHub issue for the visitor to review and submit. Visitors can also specify an issue repository in the form when no default is configured, or copy the draft as Markdown. This setting is public and requires no token.

## Deploy with GitHub Pages

In the repository's **Settings → Pages**, set **Source** to **GitHub Actions**. GitHub requires an eligible plan for Pages in a private repository.

The workflow in `.github/workflows/pages.yml` builds with Node.js 22 and deploys `dist/` on pushes to `main`. You can also start **Deploy SkillAtlas to GitHub Pages** manually in the **Actions** tab. The build uses relative asset paths so it can run under the repository's `/Skill-Atlas/` path.

## Other static hosts

| Setting | Cloudflare Pages | Vercel |
| --- | --- | --- |
| Framework preset | Vite | Vite |
| Install command | `npm ci` | `npm ci` |
| Build command | `npm run build` | `npm run build` |
| Build output directory | `dist` | `dist` |
| Node.js | 22.12+ | 22.12+ |

Connect your repository, set the build options and optional issue repository variable, and deploy. For Cloudflare Pages Direct Upload, build locally and upload the contents of `dist/`. The app uses one page and needs no server, database, API key, or custom routing.

[Cloudflare Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/) · [Vercel’s Vite guide](https://vercel.com/docs/frameworks/frontend/vite)

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Document shell, metadata and initial theme |
| `src/main.tsx` | React entry and self-hosted Inter |
| `src/App.tsx` | App layout, navigation, search, filtering, and local storage |
| `src/catalog.ts` | Types, filter definitions, fuzzy lookup and metadata helpers |
| `src/components/CatalogUI.tsx` | Cards, filters, comparison and empty states |
| `src/components/Dialogs.tsx` | Details, cross-site search, mobile filters and issue forms |
| `src/components/AtlasGraphic.tsx` | Decorative vector artwork |
| `src/styles.css` | Tailwind entry, themes and responsive layout |
| `data/sites.json` | Verified catalog and first-party sources |
| `public/` | SkillAtlas mark and destination favicons |
| `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json` | Dependencies and build configuration |
