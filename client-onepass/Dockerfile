FROM node:18 as BUILD_IMAGE
WORKDIR /usr/bin/react-app-dev
COPY package.json .
RUN npm install
COPY . .
RUN npm run build

FROM node:18 as PRODUCTION_IMAGE
WORKDIR /usr/bin/react-app-prod
COPY package.json .
COPY vite.config.js .
COPY --from=BUILD_IMAGE /usr/bin/react-app-dev/dist/ /usr/bin/react-app-prod/dist