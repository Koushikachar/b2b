# Deploying to the server (automatic from GitHub)

Every push to `master` runs CI (`.github/workflows/ci.yml`: typecheck, lint,
tests, audit). When CI passes, `.github/workflows/deploy.yml` connects to the
server over SSH, builds the new version in its own folder and switches the site
over only after the build succeeds. The running site never goes down, and a
failed build changes nothing.

```
/var/www/direct2hub/
  shared/.env      production settings (only here, never in git)
  releases/…       one folder per deploy (last 3 kept)
  current  ->      the live release; pm2 runs the app from here
```

## One-time server setup (Ubuntu, as root)

```bash
apt update && apt upgrade -y
apt install -y git nginx certbot python3-certbot-nginx ufw
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt install -y nodejs
corepack enable && corepack prepare pnpm@12.21.0 --activate
npm install -g pm2
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable
# Builds need ~2 GB RAM; add swap on smaller servers:
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile \
  && echo '/swapfile none swap sw 0 0' >> /etc/fstab

# A dedicated user for the app and for GitHub Actions (not root):
adduser --disabled-password --gecos "" deploy
mkdir -p /var/www/direct2hub/{shared,releases} && chown -R deploy:deploy /var/www/direct2hub
```

### As the `deploy` user (`su - deploy`)

1. **Let the server read the repo** (deploy key, read-only):
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/github -N "" -C "direct2hub-server"
   printf "Host github.com\n  IdentityFile ~/.ssh/github\n  StrictHostKeyChecking accept-new\n" >> ~/.ssh/config
   cat ~/.ssh/github.pub
   ```
   GitHub → Koushikachar/b2b → Settings → Deploy keys → Add deploy key → paste,
   leave "Allow write access" **off**.

2. **Let GitHub Actions log in to the server:**
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/actions -N "" -C "github-actions"
   cat ~/.ssh/actions.pub >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys
   cat ~/.ssh/actions            # private key -> GitHub secret SSH_KEY (whole text)
   rm ~/.ssh/actions             # not needed on the server after copying
   ssh-keygen -l -f /etc/ssh/ssh_host_ed25519_key.pub | cut -d' ' -f2   # -> SSH_FINGERPRINT
   ```

3. **Production settings** in `/var/www/direct2hub/shared/.env`
   (`NEXT_PUBLIC_*` values are baked in at build time, so this must exist before
   the first deploy):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   NEXT_PUBLIC_APP_URL=https://direct2hub.in
   ```
   Never put `SUPABASE_ACCESS_TOKEN` here. Then `chmod 600 /var/www/direct2hub/shared/.env`.

4. **Start pm2 on boot:** run `pm2 startup` and execute the `sudo …` line it prints
   (as root), then after the first deploy `pm2 save`.

### GitHub repository secrets

GitHub → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
|---|---|
| `SSH_HOST` | the server's IP address |
| `SSH_USER` | `deploy` |
| `SSH_KEY` | the private key printed in step 2 (including the BEGIN/END lines) |
| `SSH_FINGERPRINT` | the `SHA256:…` value from step 2 |
| `SSH_PORT` | only if SSH is not on port 22 |

### Nginx + HTTPS (as root)

`/etc/nginx/sites-available/direct2hub`:

```nginx
server {
    listen 80;
    server_name direct2hub.in www.direct2hub.in direct2hub.com www.direct2hub.com;
    client_max_body_size 25m;   # >= next.config bodySizeLimit (20 MB: 8 high-quality product photos)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;      # login links are built from these two
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
ln -s /etc/nginx/sites-available/direct2hub /etc/nginx/sites-enabled/ && rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
certbot --nginx -d direct2hub.in -d www.direct2hub.in -d direct2hub.com -d www.direct2hub.com
```

DNS: A records for all four names → the server IP. Supabase → Authentication →
URL Configuration: Site URL `https://direct2hub.in`; Redirect URLs
`https://direct2hub.in/**`, `https://direct2hub.com/**`.

## First deploy

GitHub → Actions → **Deploy** → **Run workflow** (or push to `master`). Watch the
log; it ends with `Live: /var/www/direct2hub/releases/…`. Then open
https://direct2hub.in.

## Day to day

- **Deploy:** push (or merge a pull request) to `master`. Nothing else.
- **See the app:** `pm2 status`, `pm2 logs direct2hub` (as `deploy`).
- **Roll back** to the previous release (as `deploy`):
  ```bash
  cd /var/www/direct2hub && ln -sfn "$(ls -1dt releases/*/ | sed -n 2p)" current && pm2 reload direct2hub
  ```
- **Change a setting:** edit `shared/.env`, then re-run **Deploy** (public values
  need a rebuild; server-only values need at least `pm2 reload direct2hub --update-env`).

`vercel.json` is unused on this server (it only applies on Vercel).
