# --- Build stage ---
FROM node:20-slim AS build

WORKDIR /app

COPY package*.json ./
# COPY .env ./
RUN npm install

COPY . .

# Set the public URL so React builds paths with /viewer
ENV PUBLIC_URL=/viewer

# Run the React production build
RUN npm run build

# --- Runtime stage ---
FROM node:20-slim

WORKDIR /app

# will remove this
RUN npm config set strict-ssl false

# Install only production deps (if needed)
COPY package*.json ./
COPY .env ./
RUN npm install --omit=dev

# Copy built static files from build stage
COPY --from=build /app/build ./build

# Install a static file server
RUN npm install -g serve

EXPOSE 3001

# Serve the built app at port 3001
CMD ["serve", "-s", "build", "-l", "3001"]
