# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |

## Reporting a Vulnerability

To report a security vulnerability, please use
[GitHub's private vulnerability reporting](https://github.com/sanderdatema/see_my_clicks/security/advisories/new).

Do not open a public issue for security vulnerabilities.

## Scope

This is a developer-only tool that runs exclusively during local development
(`vite dev`). It is never included in production builds. The attack surface is
limited to the developer's own machine and localhost network.

Security concerns specific to this tool include:
- JavaScript injection via the client script
- Data written to `.see-my-clicks/clicked.json`
- CLI file operations during `init`

## Response Timeline

I aim to acknowledge reports within 7 days and provide a fix or mitigation
within 30 days for confirmed vulnerabilities.
