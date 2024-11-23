Media Downloads Organizer
=========================

Move your movies / series from a downloads directory to your movies / series directory.  
Rename your downloaded movies by following a pattern.  
Download movie poster.  
Get movie informations (title, year, synopsis, director, etc...).

## Implemented providers

- Allocine.fr (French)

## Patterns

Output syntax examples :
- Movies :  
`<Title> (<Year>) <Language> <VideoCodec> <VideoQuality> <AudioCodec> <AudioQuality>.<Extension>`
- Series :  
`<Title>/Saison <SeasonNumber> (<Year>)/<Title> S<SeasonNumber>E<EpisodeNumber> <EpisodeFinal> <EpisodeTitle> <Language> <VideoCodec> <VideoQuality> <AudioCodec> <AudioQuality>.<Extension>`

You can find the field names list in the project resource files :
- Movies :
    - [/res/commonInfos.json](https://github.com/antlafarge/media-downloads-organizer/blob/main/res/commonInfos.json)
- Series :
    - [/res/commonInfos.json](https://github.com/antlafarge/media-downloads-organizer/blob/main/res/commonInfos.json)
    - [/res/serieInfos.json](https://github.com/antlafarge/media-downloads-organizer/blob/main/res/serieInfos.json)

# Docker

## Compose

```yml
services:
    media-downloads-organizer:
        image: antlafarge/media-downloads-organizer:latest
        container_name: mdo
        user: 1000:100
        volumes:
            - "/hdd/Downloads/:/usr/src/app/downloads/"
            - "/hdd/Movies/:/usr/src/app/movies/"
            - "/hdd/Series/:/usr/src/app/series/"
        environment:
            - "MovieProvider=allocineMovieProvider"
            - "SerieProvider=allocineSerieProvider"
            - "ScanFileExtensions=mkv|avi|mp4|m4[vp]|og[gv]|flv|wmv|webm|mov|avchd|ts|mpe?g|3gp"
            - "OutputMoviePattern=<Title> (<Year>) <Language> <VideoCodec> <VideoQuality> <AudioCodec> <AudioQuality>.<Extension>"
            - "OutputSeriePattern=<Title>/Saison <SeasonNumber> (<Year>)/<Title> S<SeasonNumber>E<EpisodeNumber> <EpisodeFinal> <EpisodeTitle> <Language> <VideoCodec> <VideoQuality> <AudioCodec> <AudioQuality>.<Extension>"
            - "MinLogLevel=LOG" # NOTHING, TEMP, DEBUG, LOG, INFO, WARNING or ERROR
```

## Run

```bash
docker run -d \
    --user 1000:100 \
    -v "/hdd/Downloads/:/usr/src/app/downloads/" \
    -v "/hdd/Movies/:/usr/src/app/movies/" \
    -v "/hdd/Series/:/usr/src/app/series/" \
    --env MovieProvider="allocineMovieProvider" \
    --env SerieProvider="allocineSerieProvider" \
    --env ScanFileExtensions="mkv|avi|mp4|m4[vp]|og[gv]|flv|wmv|webm|mov|avchd|ts|mpe?g|3gp" \
    --env OutputMoviePattern="<Title> (<Year>) <Language> <VideoCodec> <VideoQuality> <AudioCodec> <AudioQuality>.<Extension>" \
    --env OutputSeriePattern="<Title>/Saison <SeasonNumber> (<Year>)/<Title> S<SeasonNumber>E<EpisodeNumber> <EpisodeFinal> <EpisodeTitle> <Language> <VideoCodec> <VideoQuality> <AudioCodec> <AudioQuality>.<Extension>" \
    --env MinLogLevel="LOG" \
    --name mdo \
antlafarge/media-downloads-organizer:latest
```
