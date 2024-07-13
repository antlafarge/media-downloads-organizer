import commonInfos from "../res/commonInfos.json" with { type: "json" };
import movieInfos from "../res/movieInfos.json" with { type: "json" };
import serieInfos from "../res/serieInfos.json" with { type: "json" };
import Logger from "../src/logger.js";

Logger.minLogLevel = (process.env.MinLogLevel != null ? Logger.LogLevel[process.env.MinLogLevel] : Logger.LogLevel.LOG);

const movieProviderId = process.env.MovieProvider ?? 'allocineMovieProvider';
const movieProviderExport = await import(`../src/providers/${movieProviderId}.js`);
const MovieProvider = movieProviderExport.default;
const movieProvider = new MovieProvider();

const serieProviderId = process.env.SerieProvider ?? 'allocineSerieProvider';
const serieProviderExport = await import(`../src/providers/${serieProviderId}.js`);
const SerieProvider = serieProviderExport.default;
const serieProvider = new SerieProvider();

const movieUrl = `https://www.allocine.fr/film/fichefilm_gen_cfilm=62.html`;
const serieUrl = `https://www.allocine.fr/series/ficheserie_gen_cserie=24971.html`;
const serieEpisodeUrl = `https://www.allocine.fr/series/ficheserie-24971/saison-35792/`;

await main();

function test(lastExitCode, testTitle, extractedData, wantedData, invert = false)
{
    Logger.group(testTitle);
    Logger.info(`Extracted data  = "${extractedData}"`);
    if (invert)
    {
        Logger.info(`Not wanted data = "${wantedData}"`);
    }
    else
    {
        Logger.info(`Wanted data     = "${wantedData}"`);
    }
    let exitCode = 0;
    if ((!invert && extractedData == wantedData) || (invert && extractedData != wantedData))
    {
        Logger.info(`PASSED`);
    }
    else
    {
        Logger.error(testTitle, `FAILED`);
        exitCode = 1;
    }
    Logger.groupEnd();
    return (lastExitCode || exitCode);
}

async function main()
{
    Logger.group('Test Movie');
    const exitCodeMovie = await testMovie();
    Logger.groupEnd();

    Logger.group('Test Serie');
    const exitCodeSerie = await testSerie();
    Logger.groupEnd();

    Logger.group('ALL TESTS');
    if (exitCodeMovie || exitCodeSerie)
    {
        Logger.info('FAILED');
        Logger.groupEnd();
        process.exit(exitCode);
    }
    else
    {
        Logger.info('PASSED');
    }
    Logger.groupEnd();
}

async function testMovie()
{
    let exitCode = 0;

    const infos = {
        ...commonInfos,
        ...movieInfos,
        'Referer': `https://www.google.com/search?q=movie`,
        'Url': movieUrl
    };

    const data = await movieProvider.fetchData(infos.Url, infos.Referer);
    exitCode = test(exitCode, 'Movie.FetchData', data, null, true);
    if (data == null)
    {
        throw new Error('No movie data');
    }

    movieProvider.extractTitle(data, infos);
    exitCode = test(exitCode, 'extractTitle', infos['Title'], `Alien, le huitième passager`);

    movieProvider.extractOriginalTitle(data, infos);
    exitCode = test(exitCode, 'extractOriginalTitle', infos['OriginalTitle'], `Alien`);

    movieProvider.extractDirectors(data, infos);
    exitCode = test(exitCode, 'extractDirectors', infos['Directors'], `Ridley Scott`);

    movieProvider.extractCreators(data, infos);
    exitCode = test(exitCode, 'extractCreators', infos['Creators'], `Dan O'Bannon, Walter Hill`);

    movieProvider.extractSynopsis(data, infos);
    exitCode = test(exitCode, 'extractSynopsis', infos['Synopsis'], `Le vaisseau commercial Nostromo et son équipage, sept hommes et femmes, rentrent sur Terre avec une importante cargaison de minerai. Mais lors d'un arrêt forcé sur une planète déserte, l'officier Kane se fait agresser par une forme de vie inconnue, une arachnide qui étouffe son visage. Après que le docteur de bord lui retire le spécimen, l'équipage retrouve le sourire et dîne ensemble. Jusqu'à ce que Kane, pris de convulsions, voit son abdomen perforé par un corps étranger vivant, qui s'échappe dans les couloirs du vaisseau...`);

    movieProvider.extractGenres(data, infos);
    exitCode = test(exitCode, 'extractGenres', infos['Genres'], `Epouvante-horreur, Science Fiction`);

    movieProvider.extractDuration(data, infos);
    exitCode = test(exitCode, 'extractDuration', infos['Duration'], `1h 56min`);

    movieProvider.extractDate(data, infos);
    exitCode = test(exitCode, 'extractDate.Date', infos['Date'], `12 septembre 1979`);
    exitCode = test(exitCode, 'extractDate.Day', infos['Day'], `12`);
    exitCode = test(exitCode, 'extractDate.Month', infos['Month'], `septembre`);
    exitCode = test(exitCode, 'extractDate.Year', infos['Year'], `1979`);

    movieProvider.extractImage(data, infos);
    exitCode = test(exitCode, 'extractImage.ImageUrl', infos['ImageUrl'], '', true);
    exitCode = test(exitCode, 'extractImage.ImageExtension', infos['ImageExtension'], '', true);

    Logger.group('MovieInfos :');
    for (let field in infos)
    {
        Logger.log(field, '=', infos[field]);
    }
    Logger.groupEnd();

    return exitCode;
}

async function testSerie()
{
    let exitCode = 0;
    
    const infos = {
        ...commonInfos,
        ...serieInfos,
        'EpisodeNumber': 2,
        'Referer': `https://www.google.com/search?q=serie`,
        'SeasonUrl': serieEpisodeUrl,
        'SeasonNumber': 1,
        'Url': serieUrl
    };

    const data = await serieProvider.fetchData(infos.Url, infos.Referer);
    const dataEpisode = await serieProvider.fetchData(infos.SeasonUrl, infos.Referer);
    exitCode = test(exitCode, 'Serie.FetchData.Url', data, null, true);
    exitCode = test(exitCode, 'Serie.FetchData.EpisodeUrl', dataEpisode, null, true);
    if (data == null || dataEpisode == null)
    {
        throw new Error('No serie data');
    }

    serieProvider.extractTitle(data, infos);
    exitCode = test(exitCode, 'extractTitle', infos['Title'], `Le jeu de la dame`);

    serieProvider.extractOriginalTitle(data, infos);
    exitCode = test(exitCode, 'extractOriginalTitle', infos['OriginalTitle'], `The Queen’s Gambit`);
    
    serieProvider.extractCreators(data, infos);
    exitCode = test(exitCode, 'extractCreators', infos['Creators'], `Scott Frank, Allan Scott`);
    
    serieProvider.extractSynopsis(data, infos);
    exitCode = test(exitCode, 'extractSynopsis', infos['Synopsis'], `En pleine Guerre froide, le parcours de huit à vingt-deux ans d'une jeune orpheline prodige des échecs, Beth Harmon. Tout en luttant contre une addiction, elle va tout mettre en place pour devenir la plus grande joueuse d’échecs du monde.`);

    serieProvider.extractGenres(data, infos);
    exitCode = test(exitCode, 'extractGenres', infos['Genres'], `Drame`);

    serieProvider.extractDuration(data, infos);
    exitCode = test(exitCode, 'extractDuration', infos['Duration'], `60 min`);
    
    serieProvider.extractDate(data, infos);
    exitCode = test(exitCode, 'extractDate.Date', infos['Date'], `2020`);
    exitCode = test(exitCode, 'extractDate.Day', infos['Day'], ``);
    exitCode = test(exitCode, 'extractDate.Month', infos['Month'], ``);
    exitCode = test(exitCode, 'extractDate.Year', infos['Year'], `2020`);
    
    serieProvider.extractImage(dataEpisode, infos);
    exitCode = test(exitCode, 'extractImage.ImageUrl', infos['ImageUrl'], '', true);
    exitCode = test(exitCode, 'extractImage.ImageExtension', infos['ImageExtension'], '', true);
    
    serieProvider.extractEpisodeInfos(dataEpisode, infos);
    exitCode = test(exitCode, 'extractEpisodeInfos.SeasonNumber', infos['SeasonNumber'], `01`);
    exitCode = test(exitCode, 'extractEpisodeInfos.EpisodeNumber', infos['EpisodeNumber'], `02`);
    exitCode = test(exitCode, 'extractEpisodeInfos.EpisodeTitle', infos['EpisodeTitle'], `changes`);
    exitCode = test(exitCode, 'extractEpisodeInfos.EpisodeSynopsis', infos['EpisodeSynopsis'], `D'abord déroutée par sa nouvelle vie en banlieue, la jeune Beth étudie ses camarades de lycée tout en élaborant un plan pour participer à un tournoi d'échecs.`);
    
    Logger.group('SerieInfos :');
    for (let field in infos)
    {
        Logger.log(field, '=', infos[field]);
    }
    Logger.groupEnd();
    
    return exitCode;
}
