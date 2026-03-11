FROM node:20-alpine

WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

RUN npm install

# Copy all source files
COPY . .

EXPOSE 3000

# Start Vite dev server bound to all interfaces
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
