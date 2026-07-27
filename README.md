# Posologia Clinical Hub

## Project info

**URL**: https://simulador.posologia.app

## How can I edit this code?

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating). This project targets the Node version pinned in `.nvmrc`.

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone https://github.com/srfernandesaraujo/posologia-clinical-hub.git

# Step 2: Navigate to the project directory.
cd posologia-clinical-hub

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase

## How can I deploy this project?

This project deploys to [Cloudflare Pages](https://pages.cloudflare.com/), connected to this GitHub repository for automatic builds on every push to `main`.

- Build command: `npm run build`
- Build output directory: `dist`
- Required environment variables (Production and Preview): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`

Client-side routing fallback for the SPA is handled by [public/_redirects](public/_redirects) (`/* /index.html 200`), which Vite copies into `dist/` on build.

## Can I connect a custom domain?

Yes. In the Cloudflare Pages project, go to **Custom domains** and add `simulador.posologia.app`, then point its DNS record (CNAME) to the `*.pages.dev` domain Cloudflare assigns the project.
