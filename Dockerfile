FROM node:lts

LABEL maintainer.name="Antoine Lafarge" \
      maintainer.email="ant.lafarge@gmail.com" \
      maintainer.github="https://github.com/antlafarge" \
      maintainer.dockerhub="https://hub.docker.com/u/antlafarge"

ENV OutputMoviePattern="<Title> (<Year>) <Quality>.<Extension>" \
    OutputSeriePattern="<Title>/Saison <SeasonNumber> (<Year>)/<Title> S<SeasonNumber>E<EpisodeNumber> <EpisodeTitle> <Quality>.<Extension>" \
    ScanFileExtensions="mkv|avi|mp4|m4[vp]|og[gv]|flv|wmv|webm|mov|avchd|ts|mpe?g|3gp" \
    MovieProvider="allocineMovieProvider" \
    SerieProvider="allocineSerieProvider" \
    MinLogLevel="LOG"

RUN npm isntall -g npm

WORKDIR /usr/src/app

COPY package.json ./

RUN npm install

COPY test test
COPY res res
COPY src src

ENTRYPOINT ["npm", "run", "start"]
