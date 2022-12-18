FROM node:16-alpine
WORKDIR /app
COPY ./package.json /app
COPY . /app
RUN rm -rf node_modules package-lock.json
RUN npm install
EXPOSE 3000
CMD npm run dev
