Media Downloads Organizer
=========================

# Docker

## First start

```bash
git clone git@github.com:antlafarge/media-downloads-organizer.git
cd ./media-downloads-organizer/
docker build -t media-downloads-organizer .
docker run -d -v "/mnt/hdd/Downloads:/usr/src/app/downloads" -v "/mnt/hdd/Movies:/usr/src/app/movies" --env OutputMoviePattern="<Title> (<Year>) <Quality>.<Extension>" --env OutputSeriePattern="<Title> S<SeasonNumber>E<EpisodeNumber> <EpisodeTitle> (<Year>) <Quality>.<Extension>" --name mdo media-downloads-organizer
```

## Next starts

### Manually

```bash
docker start mdo
```

### Crontab

```bash
crontab -e
```

Add this line :
```
0 0,12 * * * docker start mdo
```

## Check logs

```bash
docker logs --follow mdo
```

## Update

- Update code :
```bash
cd ./media-downloads-organizer/
git pull
docker rm -f mdo
```
- Re-do these steps from 'First start'
    - Docker build
    - Docker run
- Remove old unsued images :
```bash
docker rmi $(docker images --filter "dangling=true" -q --no-trunc)
```

## Remove / clean

```bash
docker rm -f mdo
docker rmi media-downloads-organizer $(docker images --filter "dangling=true" -q --no-trunc) node
rm -R ./media-downloads-organizer/
```

# Node.js commands reminder

```bash
npm isntall -g npm
# npm init -y
# npm install --save node-fetch jsdom
npm install --save
node src/main.js # Or F5 to start debugging
```

# Build

```ps
docker buildx ls
docker buildx rm mybuilder
docker buildx create --name mybuilder
docker buildx use mybuilder
docker buildx inspect --bootstrap
docker buildx build --platform linux/arm64/v8 -t antlafarge/media-downloads-organizer:latest -f Dockerfile --push .
```
