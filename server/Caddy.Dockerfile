# Caddy oficial NU include directiva `rate_limit` — e un modul extern.
# Îl compilăm cu xcaddy, altfel Caddy refuză să pornească („unrecognized directive").
FROM caddy:2-builder AS builder
RUN xcaddy build --with github.com/mholt/caddy-ratelimit

FROM caddy:2
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
