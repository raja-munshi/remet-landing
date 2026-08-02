# Remet — landing page

Static site. No build step, no dependencies to install.

```
index.html        router — sends phones to mobile, everything else to desktop
desktop.dc.html   desktop layout
mobile.dc.html    mobile layout
support.js        runtime both pages load
door.js           the WebGL door / light / particle scene
brand/            logo mark + wordmark (transparent PNG)
munshi/           Munshi expression set (transparent PNG)
.nojekyll         stops GitHub Pages from skipping munshi/_contact-sheet.png
```

## Run locally

Open a terminal in this folder:

```
python3 -m http.server 8000
```

Then visit http://localhost:8000 — open it directly with `file://` and the
browser will block the module imports.

## Deploy

Any static host works. Push this folder to a repo and turn on GitHub Pages,
or drag it onto Netlify / Vercel / Cloudflare Pages.

Force a layout with `?v=mobile` or `?v=desktop` on the root URL.

Fonts load from Google Fonts and three.js from esm.sh, so the page needs a
network connection on first paint.
