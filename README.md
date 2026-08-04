# Repro: Dependabot npm security update fails for transitive js-yaml although the fix is in-range

Minimal public reproduction for a `dependabot-core` bug: the npm **VulnerabilityAuditor**
reports `fix_unavailable` for a transitive `js-yaml` although the fixed version satisfies
the parent's range — with **no `.npmrc` and no `dependabot.yml`** in the repo.

## Setup (3 files)

- `package.json` — two devDependencies: `@vitejs/plugin-react@5.1.4` and
  `@istanbuljs/load-nyc-config@1.1.0`.
- `package-lock.json` — pins two vulnerable transitives, both valid in-range resolutions
  that `npm install --package-lock-only` reproduces unchanged:
  - `@babel/core` **7.29.0** ([GHSA-4x5r-pxfx-6jf8](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8), fixed 7.29.6, parent range `^7.29.0`)
  - `js-yaml` **3.14.2** ([GHSA-52cp-r559-cp3m](https://github.com/advisories/GHSA-52cp-r559-cp3m) / [GHSA-h67p-54hq-rp68](https://github.com/advisories/GHSA-h67p-54hq-rp68), fixed 3.15.0, parent range `^3.13.1`)

## Result: identical setup — one fixed, one not

| Update job | Outcome | Public log |
|---|---|---|
| `@babel/core` security update | ✅ PR #1 (7.29.0 → 7.29.7) | [run 30920221409](https://github.com/svenr-funke/dependabot-npm-vuln-auditor-repro/actions/runs/30920221409) |
| `@babel/core` `@dependabot recreate` | ✅ recreated | [run 30920420023](https://github.com/svenr-funke/dependabot-npm-vuln-auditor-repro/actions/runs/30920420023) |
| `js-yaml` security update (auto) | ❌ `fix_unavailable` | [run 30920942751](https://github.com/svenr-funke/dependabot-npm-vuln-auditor-repro/actions/runs/30920942751) |
| `js-yaml` retry, `.npmrc` `min-release-age=3` | ❌ same | [run 30922473037](https://github.com/svenr-funke/dependabot-npm-vuln-auditor-repro/actions/runs/30922473037) |
| `js-yaml` retry, `.npmrc` `min-release-age=1` | ❌ same | [run 30923105626](https://github.com/svenr-funke/dependabot-npm-vuln-auditor-repro/actions/runs/30923105626) |
| `js-yaml` retry, **no `.npmrc` at all** | ❌ same | [run 30923727722](https://github.com/svenr-funke/dependabot-npm-vuln-auditor-repro/actions/runs/30923727722) |

(The `.npmrc` variations exist because we first suspected npm's `min-release-age` — the
history of this repo is the bisection. The final state has no `.npmrc`; the failure is
config-independent.)

## The error

```
VulnerabilityAuditor: audit result not viable: fix_unavailable
The latest possible version that can be installed is 3.14.2 because of the following conflicting dependency:
  - @istanbuljs/load-nyc-config: requires js-yaml@^3.13.1
The earliest fixed version is 3.15.0.
```

The stated conflict is self-contradictory: `^3.13.1` admits 3.15.0 and 3.15.1.

## Native npm behavior

```
$ npm audit --package-lock-only
js-yaml  <=3.14.2  Severity: high — fix available via `npm audit fix`
```

`npm audit fix --package-lock-only` bumps js-yaml to 3.15.1 in place.

## What's special about js-yaml?

Unknown — that's the bug hunt. Notable difference to the passing `@babel/core` case: the
js-yaml security job carries **nine** advisory entries spanning three majors
(`< 2.0.5` … `>= 3.0.0 < 3.15.0` … `>= 4.0.0 < 4.3.0` … `>= 5.0.0 <= 5.2.1`), while
`@babel/core` has a single-range advisory. See the job-definition JSON at the top of any
failing run log.
