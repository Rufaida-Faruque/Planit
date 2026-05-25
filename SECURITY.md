# Security

## Reporting

If you find a vulnerability in this academic project, please open a GitHub issue (private disclosure via email is fine for coursework).

## Secrets

- Never commit `backend/.env` or `frontend/.env`.
- Use `backend/.env.example` and `frontend/.env.example` as templates only.
- **If an email app password or JWT secret was ever pushed to GitHub:** rotate it immediately in Google Account → Security → App passwords, and update your local `.env`.

## Production checklist

- [ ] Set strong `JWT_SECRET`
- [ ] Change `ADMIN_PASSWORD_HASH` (generate with `bcrypt` for your new password)
- [ ] Restrict CORS `FRONTEND_URL` to your deployed domain
- [ ] Use MongoDB Atlas with IP allowlist and strong credentials
- [ ] Serve uploads from durable storage (not ephemeral container disk)
- [ ] Enable HTTPS on frontend and API

## Simulated payments

Wallet and settlement flows are **not** real payment processing. Do not expose this module as production billing without a certified payment provider.
