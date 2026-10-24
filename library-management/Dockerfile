FROM node:18-alpine

WORKDIR /usr/src/app

# Cài đặt curl để hỗ trợ docker healthcheck
RUN apk add --no-cache curl

# Phân quyền thư mục làm việc cho user node
RUN chown -R node:node /usr/src/app

USER node

# Copy file dependency và gán quyền trực tiếp
COPY --chown=node:node package*.json ./

RUN npm ci --only=production --omit=dev

# Copy toàn bộ source code với quyền node
COPY --chown=node:node . .

EXPOSE 3000

CMD ["node", "server.js"]
