# Lightweight native Node.js Alpine image
FROM node:20-alpine

LABEL maintainer=Govind S R (theinfinox)
LABEL description=KTU CGPA Standalone PWA & Fast Sync Relay

WORKDIR /app

# Copy all application files (zero external npm dependencies required)
COPY . .

# Expose HTTP port
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

# Run native Node.js server
CMD [node, server.js]
