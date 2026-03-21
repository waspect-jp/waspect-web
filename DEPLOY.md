# Deploying Waspect to Netlify

## Prerequisites
- A Netlify account (free tier works): https://app.netlify.com/signup
- The GitHub repo: https://github.com/waspect-jp/waspect-web
- DNS access for waspect.jp (currently on Squarespace)

## Step 1: Push to GitHub

```bash
cd ~/projects/waspect-web
git add -A
git commit -m "Initial commit: Waspect website with i18n"
git push -u origin main
```

## Step 2: Connect Netlify to GitHub

1. Go to https://app.netlify.com
2. Click **"Add new site"** > **"Import an existing project"**
3. Choose **GitHub** and authorize Netlify
4. Select the **waspect-jp/waspect-web** repository
5. Netlify will auto-detect settings from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Click **"Deploy site"**

Netlify will build and deploy. First deploy takes ~1 minute.

## Step 3: Forms Setup

The contact form and newsletter form use `data-netlify="true"`. Netlify auto-detects these on the first deploy.

To receive email notifications:
1. In Netlify dashboard, go to **Site settings** > **Forms**
2. You should see forms named `contact` and `newsletter`
3. Click **Form notifications** > **Add notification** > **Email notification**
4. Enter `info@waspect.jp` as the recipient
5. Choose which form(s) trigger the notification

Submissions are also visible in the **Forms** tab of your Netlify dashboard.

## Step 4: Custom Domain (waspect.jp)

### In Netlify:
1. Go to **Site settings** > **Domain management**
2. Click **"Add custom domain"**
3. Enter `waspect.jp`
4. Netlify will ask you to verify ownership

### In Squarespace DNS (or wherever waspect.jp DNS is managed):
Add these DNS records:

| Type  | Name | Value                          |
|-------|------|--------------------------------|
| A     | @    | `75.2.60.5`                    |
| CNAME | www  | `your-site-name.netlify.app`   |

(Replace `your-site-name` with your actual Netlify subdomain shown in the dashboard.)

### Enable HTTPS:
1. In Netlify, go to **Domain management** > **HTTPS**
2. Click **"Verify DNS configuration"**
3. Click **"Provision certificate"** (Let's Encrypt, free)
4. Wait ~5 minutes for the certificate to propagate

## Step 5: Verify Everything Works

After deploy + DNS propagation (~5-30 minutes):

- [ ] https://waspect.jp loads (Japanese homepage)
- [ ] https://waspect.jp/en/ loads (English homepage)
- [ ] All 6 pages work in both languages
- [ ] Language switcher toggles between JP and EN
- [ ] Contact form submissions appear in Netlify Forms dashboard
- [ ] Newsletter form submissions appear
- [ ] Images load correctly
- [ ] Social share preview works (test at https://www.opengraph.xyz)

## Continuous Deployment

Every `git push` to `main` will auto-deploy. Netlify builds take ~30 seconds.

## Troubleshooting

**Forms not showing up?**
Netlify only detects forms after the first successful deploy. If forms don't appear, trigger a new deploy (push a small change).

**Custom domain not working?**
DNS propagation can take up to 48 hours. Check status at https://dnschecker.org.

**Build fails?**
Run `npm run build` locally first to check for errors. Netlify uses the same Node.js version specified in `package.json` engines field.
