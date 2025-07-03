# --- Development container ---
FROM node:20 as dev
WORKDIR /app
COPY . .
RUN npm install

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# --- API Development container ---
FROM node:20 as api-dev
WORKDIR /app
COPY . .
RUN npm install

EXPOSE 3001
CMD ["npm", "run", "api"]

# --- Production build container ---
FROM node:20 as build
WORKDIR /app
COPY . .
RUN npm install && npm run build

# --- Production API container ---
FROM node:20 as api-prod
WORKDIR /app
COPY package*.json ./
COPY api-server.js ./
RUN npm install --only=production

EXPOSE 3001
CMD ["node", "api-server.js"]

# --- Production web container using NGINX ---
FROM nginx:alpine as web-prod
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config that proxies API requests
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]