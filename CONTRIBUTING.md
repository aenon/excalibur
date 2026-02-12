# Contributing to Excalibur

## Getting Started

Clone the repository:

```bash
git clone git@github.com:aenon/excalibur.git
cd excalibur
```

Or via HTTPS:

```bash
git clone https://github.com/aenon/excalibur.git
cd excalibur
```

## Development Workflow

All changes go through **pull requests** — do not push directly to `main`.

1. Create a feature branch from `main`:

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

2. Make your changes and commit.

3. Push the branch and open a PR:

```bash
git push -u origin feature/your-feature-name
```

Then create a PR on GitHub targeting `main`.

4. Once reviewed/approved, merge the PR on GitHub.

### Branch Naming

- `feature/` — new features (e.g., `feature/google-auth`)
- `fix/` — bug fixes (e.g., `fix/room-code-collision`)
- `chore/` — infrastructure, config, docs (e.g., `chore/ci-setup`)
