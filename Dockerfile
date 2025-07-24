# Stage 1: Build the NestJS app
FROM node:18-alpine AS build

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

COPY package*.json ./
COPY pnpm-lock.yaml ./
# If you use pnpm-lock.yaml, copy that too for consistent builds
# COPY pnpm-lock.yaml ./ 
RUN pnpm install --force

EXPOSE 3000
CMD ["/setup.ps1"]
CMD ["node", "bfl_image_editor.js"]
