# Stage 1: Build the NestJS app
FROM node:18-alpine AS build

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

COPY --chown=node:node package.json pnpm-lock.yaml ./
# If you use pnpm-lock.yaml, copy that too for consistent builds
# COPY pnpm-lock.yaml ./ 
RUN pnpm install --force

EXPOSE 3000
# Install Playwright dependencies
RUN pnpm install --force
RUN npx playwright install --with-deps

# Set the entrypoint to bfl_image_editor.js
CMD ["node", "bfl_image_editor.js"]
