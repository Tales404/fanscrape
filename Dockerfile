# Base image with Chromium, Firefox, WebKit and all system deps pre‑installed
FROM mcr.microsoft.com/playwright:v1.45.0-jammy

# Set working directory inside the container
WORKDIR /app

# Copy only the package descriptors first to leverage Docker layer caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev --omit=optional

# Copy the rest of the source code
COPY . .

# Run as the non‑root Playwright user that comes with the base image
USER pwuser

# Expose the port your Express server listens on
EXPOSE 8080

# Start the server
CMD ["npm", "start"]
