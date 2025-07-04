# --- Development container ---
FROM node:20 AS dev
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# --- API Development container ---
FROM node:20 AS api-dev
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3001
CMD ["npm", "run", "api"]

# --- Production build container ---
FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Production API container ---
FROM node:20 AS api-prod
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY api-server.js ./

EXPOSE 3001
CMD ["node", "api-server.js"]

# --- Production web container using NGINX ---
FROM nginx:alpine AS web-prod
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config that proxies API requests
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]