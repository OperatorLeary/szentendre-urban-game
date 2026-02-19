# Git Branching Quickstart (Beginner)

This project should not be developed directly on `main`.

## Why branches exist

Branches let you:
- keep production stable on `main`
- work safely on new changes without breaking the live app
- review changes in pull requests before release

## Branches to use in this repo

- `main`: production branch (Cloudflare Pages should deploy from this)
- `develop`: integration branch (all completed features merge here first)
- `feature/*`: normal work branches, created from `develop`
- `hotfix/*`: urgent fixes, created from `main`

## What to create now

You currently only have `main`. Create `develop` first.

```bash
git checkout main
git pull origin main
git checkout -b develop
git push -u origin develop
```

After that, create feature branches from `develop`, for example:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/quest-home-ui
```

## Daily workflow

1. Start from `develop` and create a feature branch.
2. Commit your work on the feature branch.
3. Push the feature branch.
4. Open PR: `feature/*` -> `develop`.
5. When a release is ready, open PR: `develop` -> `main`.

## Command flow (copy/paste)

```bash
# start work
git checkout develop
git pull origin develop
git checkout -b feature/your-change

# commit and push
git add .
git commit -m "feat(scope): describe change"
git push -u origin feature/your-change

# later, after PR merge, update local develop
git checkout develop
git pull origin develop
```

## Hotfix workflow

If production breaks:

```bash
git checkout main
git pull origin main
git checkout -b hotfix/fix-production-issue
```

After the hotfix PR to `main` is merged, also merge that hotfix into `develop` so branches stay in sync.

## Commit format

Use Conventional Commits:
- `feat:` new feature
- `fix:` bug fix
- `refactor:` internal restructuring
- `chore:` tooling/maintenance
- `docs:` documentation

Examples:
- `feat(route): add route selection cards`
- `fix(validation): handle undefined qr payload groups`
- `chore(ci): trigger pages redeploy`

