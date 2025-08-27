# Use Node.js LTS
FROM node:20-alpine

# Set working dir
WORKDIR /app

# Copy package files and install deps
COPY package*.json ./
RUN npm install

# Copy rest of the code
COPY . .

# Build TS -> JS
RUN npm run build

# Expose backend port
EXPOSE 4000

# Run the backend (adjust entrypoint if needed)
CMD ["node", "dist/server.js"]
