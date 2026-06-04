const html = `<!doctype html>
<html lang="lt">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>Techninė priežiūra — WAL GO</title>
    <link rel="icon" href="/logo.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Newsreader:ital,opsz@0,6..72;1,6..72&display=swap" rel="stylesheet" />
    <style>
      :root {
        --background: oklch(0.97 0.008 90);
        --foreground: oklch(0.25 0.04 50);
        --card: oklch(0.98 0.006 90);
        --muted-foreground: oklch(0.5 0.03 60);
        --border: oklch(0.88 0.02 80);
        --rust: oklch(0.5 0.18 35);
        --rust-foreground: oklch(0.98 0.006 90);
        --golden: oklch(0.78 0.14 85);
        --radius: 0.625rem;
        --font-sans: "Geist", system-ui, sans-serif;
        --font-serif: "Newsreader", Georgia, serif;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --background: oklch(0.22 0.025 55);
          --foreground: oklch(0.93 0.015 80);
          --card: oklch(0.27 0.025 55);
          --muted-foreground: oklch(0.65 0.03 70);
          --border: oklch(1 0.02 80 / 12%);
          --rust: oklch(0.72 0.16 35);
          --rust-foreground: oklch(0.16 0.03 35);
          --golden: oklch(0.82 0.13 85);
        }
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        min-height: 100dvh;
        display: grid;
        place-items: center;
        padding: 1.5rem;
        background: var(--background);
        color: var(--foreground);
        font-family: var(--font-sans);
        -webkit-font-smoothing: antialiased;
      }
      main {
        width: 100%;
        max-width: 30rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 1.5rem;
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: calc(var(--radius) * 1.6);
        padding: 2.5rem 2rem;
        box-shadow: 0 1px 2px oklch(0 0 0 / 6%), 0 12px 40px oklch(0 0 0 / 8%);
      }
      img.logo { width: 11rem; max-width: 70%; height: auto; }
      h1 {
        font-family: var(--font-serif);
        font-weight: 500;
        font-size: 1.7rem;
        line-height: 1.2;
        margin: 0;
      }
      p { margin: 0; line-height: 1.6; color: var(--muted-foreground); }
      .divider { width: 3rem; height: 3px; border-radius: 999px; background: var(--golden); }
      a.discord {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        text-decoration: none;
        font-weight: 600;
        font-size: 0.95rem;
        color: var(--rust-foreground);
        background: var(--rust);
        padding: 0.7rem 1.25rem;
        border-radius: var(--radius);
        transition: opacity 0.15s ease;
      }
      a.discord:hover { opacity: 0.9; }
      a.discord svg { width: 1.2rem; height: 1.2rem; }
    </style>
  </head>
  <body>
    <main>
      <img class="logo" src="/logo.png" alt="WAL GO" />
      <div class="divider"></div>
      <h1>Techninė problema</h1>
      <p>WAL GO laikinai nepasiekiamas. Sekite naujienas Discord bendruomenėje.</p>
      <a class="discord" href="https://discord.gg/ksga7GtvXR" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3.2a.074.074 0 0 0-.079.037c-.34.6-.717 1.385-.98 2.003a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.997-2.003.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C1.533 7.55.954 10.64 1.24 13.69a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.041-.105 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127c-.598.349-1.225.645-1.873.891a.076.076 0 0 0-.04.106c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-3.527-.838-6.59-3.549-9.305a.06.06 0 0 0-.031-.028ZM8.02 12.332c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z"/></svg>
        Prisijunk prie Discord
      </a>
    </main>
  </body>
</html>`;

export default {
	fetch() {
		return new Response(html, {
			status: 503,
			headers: {
				"content-type": "text/html; charset=utf-8",
				"retry-after": "3600",
				"cache-control": "no-store",
			},
		});
	},
};
