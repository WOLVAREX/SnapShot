# Contributing to SnapShot

Thank you for your interest in contributing! SnapShot is open source under the MIT license — anyone is free to fork, clone, and adapt it.

---

## Ways to Contribute

- **Bug reports** — open an issue describing the problem, steps to reproduce, and expected behavior
- **Feature requests** — open an issue with a clear description of the use case
- **Pull requests** — fork the repo, make your changes, and open a PR

---

## Development Setup

Follow the [Getting Started](./README.md#getting-started) steps in the README to get the project running locally.

---

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Stable production code |
| `feature/*` | New features |
| `fix/*` | Bug fixes |

Always branch off `main` and open PRs back to `main`.

---

## Code Style

- **TypeScript** everywhere — no `any` unless unavoidable (add an eslint-disable comment with a reason)
- **No `console.log` in server code** — use `req.log` in route handlers, `logger` elsewhere
- **Zod validation** on all API inputs and outputs
- Run `pnpm run typecheck` before pushing — CI will reject type errors
- Follow the existing file/folder conventions in each package

---

## Adding a New API Endpoint

1. Add the route to `lib/api-spec/openapi.yaml` (this is the source of truth)
2. Run `pnpm --filter @workspace/api-spec run codegen` to regenerate Zod schemas and React Query hooks
3. Implement the route handler in `artifacts/api-server/src/routes/`
4. Use the generated Zod schema for request validation
5. Document the endpoint in `DOCS.md`

---

## Pull Request Checklist

- [ ] `pnpm run typecheck` passes with no errors
- [ ] New endpoints are documented in `DOCS.md`
- [ ] No secrets or credentials committed
- [ ] PR description explains the what and why

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
