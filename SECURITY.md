
# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability within AlgoTouch, please send an email to [security@algotouch.com](mailto:security@algotouch.com). All security vulnerabilities will be promptly addressed.

## Dependency Management

This project uses GitHub's Dependabot to automatically scan for vulnerable dependencies. Dependabot creates pull requests to update dependencies when security vulnerabilities are found.

### How We Handle Dependencies

1. **Automated Scanning**: Dependabot scans dependencies daily and creates PRs for security updates.
2. **Manual Review**: All PRs created by Dependabot require manual review before merging.
3. **Testing**: Before merging any dependency updates, we test functionality to ensure no breaking changes.
4. **Manual Auditing**: We periodically run `npm audit` to identify and fix any vulnerabilities.

### Guidelines for Reviewing Dependabot PRs

When reviewing a Dependabot pull request:

1. Check the changelog or release notes for the updated package.
2. Run the application locally to verify that no functionality is broken.
3. Run tests to ensure all tests pass with the updated dependency.
4. If there are breaking changes, assess the effort required to adapt our code.

## Manual Security Audits

To manually check for vulnerabilities:

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities (where possible automatically)
npm audit fix

# For vulnerability fixes that require major version changes
npm audit fix --force # Use with caution
```
