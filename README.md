# Repro: npm security updates fail when the project `.npmrc` sets `min-release-age`

Minimal reproduction for a `dependabot-core` bug: **Dependabot security updates for
transitive npm dependencies fail in the VulnerabilityAuditor stage when the project
`.npmrc` contains `min-release-age`** — the bypasses added in
dependabot/dependabot-core#15139 and dependabot/dependabot-core#15386 cover the npm
install / `npm update` / `npm audit fix` commands, but not the audit that computes
`fix_available`.

## Setup

- `package.json` — one devDependency, `@vitejs/plugin-react@5.1.4`, plus
  `engines.npm >= 11.14.0` (npm applies `min-release-age` from a project `.npmrc` only
  since 11.14).
- `package-lock.json` — pins the transitive `@babel/core` at **7.29.0**, which is
  vulnerable to [GHSA-4x5r-pxfx-6jf8](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8)
  (fixed in 7.29.6, published 2026-05-25 — months past any cooldown). The pin is a valid
  in-range resolution (`@vitejs/plugin-react` requires `^7.29.0`); `npm install
  --package-lock-only` reproduces the lockfile unchanged.
- `.npmrc` — `min-release-age=3`.

## Expected

With Dependabot alerts + security updates enabled, Dependabot opens a security PR bumping
`@babel/core` to ≥ 7.29.6 — security updates are supposed to ignore `min-release-age`
(dependabot/dependabot-core#15112, #15366).

## Actual

The security-update job errors in the vulnerability-audit stage:

```
The latest possible version that can be installed is 7.29.0 because of the following conflicting dependency:
The earliest fixed version is 7.29.6.
```

with `fix_available: false`, although every dependent's requirement (`^7.29.0`) admits
7.29.6.

## Native npm behavior (same `.npmrc`)

```
$ npm audit --package-lock-only
@babel/core  <=7.29.0 — fix available via `npm audit fix`
```

`npm audit fix --package-lock-only` bumps to 7.29.7 without any override flag (the fixed
versions clear the 3-day cooldown on age alone).

## Control experiment

Delete `.npmrc` (or set `min-release-age=0`) and re-trigger the security update — the PR is
created. The `.npmrc` line is the only variable.
