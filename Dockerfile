# exposed on NAS with port 20003

FROM node:lts-alpine AS builder

# if API is behind a reverse proxy, use relative URLs
ENV NEXT_PUBLIC_EXCHANGE_RATES_URL=api/exchange-rate-ecb
ENV NEXT_PUBLIC_YAHOO_URL=api/yahoo-finance
ENV NEXT_PUBLIC_AUTH0_DOMAIN=dev-oh3skfd6.us.auth0.com
ENV NEXT_PUBLIC_AUTH0_CLIENT_ID=IRO3ziJRgAvy03EjWdXpvrUgkdh9ameo

# ENV REACT_APP_YAHOO_URL=https://stockquote-api.lionelschiepers.synology.me/api/yahoo-finance
# ENV REACT_APP_EXCHANGE_RATES_URL=https://stockquote-api.lionelschiepers.synology.me/api/exchange-rate-ecb

ENV NODE_ENV=production

WORKDIR /app

# copy both package.json and package-lock.json to leverage layer cache & reproducible installs
COPY package*.json ./

# prefer npm ci when a lockfile exists (faster, deterministic)
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
# RUN npm audit fix

COPY . .

# build with full dependencies present
RUN npm run build

FROM nginx:alpine AS production

# Install a small HTTP client for the healthcheck. Avoid full update/upgrade to keep image small.
RUN apk add --no-cache curl

# Copy the built application from the builder stage
COPY --from=builder /app/out /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create dedicated non-root user for security
# RUN adduser --disabled-password --comment "" appuser
# RUN chown appuser:appuser /usr/share/nginx/html
# USER appuser

# Expose port 80
EXPOSE 80

# simple HTTP healthcheck (uses curl)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
