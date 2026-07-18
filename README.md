# Hydro OMMS - Public Demo

This repository contains a static, browser-only demonstration of the Hydro Plant Operations and Maintenance Management System.

## Important

- All displayed records are generated sample data.
- No plant operational records, user accounts, passwords, certificates, uploads, backups, or SMTP settings are included.
- Changes are stored only in the visitor's browser and can be cleared with **Reset demo**.
- The production OMMS runs on the plant LAN with a Node.js backend, role-based access control, server storage, backups, and internal-CA HTTPS. Those server capabilities are simulated here because GitHub Pages hosts static files only.

## Demo login

The demo signs in automatically. After logging out, use:

- Username: `demo`
- Password: `demo`

## Technology

- HTML5
- CSS3
- Vanilla JavaScript
- Browser-local demonstration API
- GitHub Pages deployment workflow

## Local preview

Run a static server in this directory, then open the displayed URL:

```powershell
python -m http.server 4180
```

## Publish to GitHub Pages

Install and authenticate GitHub CLI, then run the guarded publishing script:

```powershell
choco install gh -y
gh auth login
./publish-github-demo.ps1
```

The expected public address is:

`https://bayisa2022.github.io/hydro-omms-demo/`

## Production warning

This repository is for demonstration only. Do not use it to store plant data or deploy it as the production OMMS.
