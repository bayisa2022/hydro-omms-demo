# Hydro OMMS - Public Demo

This repository contains a static, browser-only demonstration of the Hydro Plant Operations and Maintenance Management System.

- **Live demo:** https://bayisa2022.github.io/hydro-omms-demo/
- **Code repository:** https://github.com/bayisa2022/hydro-omms-demo

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

## Built with Codex and GPT-5.6

GPT-5.6 was used through Codex as an AI development partner across the project lifecycle. Codex worked directly with the local codebase, while the developer supplied the hydropower maintenance requirements, reviewed the results, tested workflows, and made the final product and deployment decisions.

Codex and GPT-5.6 supported the project by:

- Translating plant operations and maintenance requirements into modules, data structures, user roles, approval workflows, and implementation tasks.
- Building and refining the HTML, CSS, and JavaScript interface for assets, work orders, reports, logbooks, inventory, users, and dashboards.
- Implementing the browser-local demo API and generated sample records used by this public version.
- Debugging authentication, work-order approvals, report submission, exports, file handling, and GitHub Pages deployment.
- Reviewing role-based access, session behavior, upload risks, HTTPS, backups, local-server deployment, and public-demo privacy boundaries.
- Creating repeatable verification tests and checking that the public repository contains no real plant identity, credentials, operational files, or private server data.

Human review remained essential. Plant-specific engineering logic, maintenance practices, operational acceptance, cybersecurity approval, and production commissioning require review by authorized plant personnel.

## Verification

Run the automated public-demo checks:

```powershell
npm test
```

The checks validate required files, demo startup data, sample work-order creation, and prohibited sensitive-content patterns.

## Local preview

Clone or download the repository, open PowerShell in this directory, run the verification, and start a static server:

```powershell
npm test
python -m http.server 4180
```

Open `http://localhost:4180/` in a browser. No database or backend service is required for this public demo.

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
