# Contributing to PM-Chat

Thank you for your interest in contributing to PM-Chat! This document provides guidelines and best practices for contributing.

---

## Getting Started

1. **Fork** the repository
2. **Clone** your fork locally
3. **Install** dependencies: `npm install`
4. **Create a branch**: `git checkout -b feature/your-feature-name`
5. **Make changes** and commit
6. **Push** to your fork and open a Pull Request

---

## Development Setup

```bash
# Install
npm install

# Copy environment files
cp .env.example .env
cp apps/server/.env.example apps/server/.env

# Start databases
docker compose up mongodb redis -d

# Start dev servers
npm run dev
```

---

## Code Guidelines

### General

- Write TypeScript — no `any` types unless absolutely necessary
- Follow existing code style and patterns
- Keep functions small and focused
- Add comments for complex logic only

### Crypto Code

- **Never** log plaintext messages, private keys, or shared secrets
- **Never** store private keys in `localStorage`
- **Always** use `crypto.getRandomValues()` for random data
- **Always** use non-extractable keys where possible
- Keep crypto code isolated from UI code in `apps/web/src/lib/crypto/`

### Security

- Validate all inputs with Zod schemas
- Never trust client-provided data on the server
- Use parameterized queries (Mongoose handles this)
- Follow the existing security guard patterns
- Test edge cases and failure modes

### Testing

- Add tests for any new crypto functions
- Add tests for new validation schemas
- Test both success and failure paths
- Run the full test suite before submitting: `npm run test`

---

## Pull Request Process

1. Ensure your changes pass all existing tests: `npm run test`
2. Ensure your changes lint cleanly: `npm run lint`
3. Ensure your changes build: `npm run build`
4. Update documentation if your change affects the API or architecture
5. Write a clear PR description explaining what and why
6. Link any related issues

---

## Commit Messages

Use clear, descriptive commit messages:

```
feat: add group conversation support
fix: prevent replay attack on message nonce
docs: update security model documentation
test: add encryption edge case tests
refactor: simplify key derivation flow
```

---

## Reporting Issues

- Use GitHub Issues
- Include steps to reproduce
- Include expected vs actual behavior
- Include environment details (Node.js version, browser, OS)
- **Never** include private keys, tokens, or message content in bug reports

---

## Code of Conduct

Be respectful, constructive, and professional. We are building privacy tools — our community should reflect the values of trust and integrity.
