# Abuzaid Mosque - Backend

Backend API for the Abuzaid Mosque website.

Features:
- Public mosque information (announcements / posts)
- Event hall booking (open to visitors, approved by admin)
- Role-based authentication: admin, teacher, student
- Public visitors (customers) do not need to register

Run in dev mode:

```
npm run dev
```

### Production on one VPS

Run one PM2 instance in fork mode with `NODE_ENV=production` and the Atlas replica-set URI in `CONECTDBB`. Node listens on localhost in production and trusts one proxy hop. Have Nginx terminate HTTPS and overwrite the forwarding headers before proxying:

```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

With `REDIS_URL` empty, rate limits are per process and reset on restart. Logout writes a SHA-256 digest to the MongoDB `revokedsessions` collection, so revocation survives a PM2 restart. Ensure the TTL index on `expiresAt` is created in Atlas.

To switch both stores to Redis, configure a persistent shared Redis instance, set `REDIS_URL`, and restart PM2 with its updated environment. At cutover in either direction, rotate the session signing key to require a fresh login, or migrate all unexpired revocations before serving requests. Enable Redis persistence and protect revocation keys from eviction so a restart or cache eviction cannot revive a logged-out session.
