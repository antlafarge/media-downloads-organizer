import fetch from "node-fetch";
import { JSDOM } from "jsdom";

import commonInfos from "../../res/commonInfos.json" with { type: "json" };
import serieInfos from "../../res/serieInfos.json" with { type: "json" };
import Logger from "../logger.js";
import { sleep } from "../async.js";
import { removeHtmlTags, getHeaders } from "../webFunctions.js";
import Provider from '../provider.js';

const minMatchThreshold = 0.5;
const bestMatchThreshold = 1.0;

export default class AllocineMovieProvider extends Provider {
    constructor() {
        super();
    }

    name() {
        return `AllocineSerieProvider`;
    }

    async getInfos(originalFileName) {
        this.webCache.reset();

        const serieResult = originalFileName.match(/^(.+)\WS\W*(\d+)\W*E\W*(\d+)(\W*FINAL)?(\W|$)/i);

        const serieTitle = serieResult[1];
        const serieSeasonNumber = serieResult[2];
        const serieEpisodeNumber = serieResult[3];
        const serieEpisodeFinal = serieResult[4];

        const googleSearchUrlBase = `https://www.google.com/search?q=`;

        // We use full file name
        const searchWords = serieTitle.match(/\w+/g);

        let bestMatch = { MatchScore: -Infinity };
        const alreadyProcessedSeries = {};

        const googleSearch = `site:allocine.fr serie ${searchWords.join(` `)} saison ${serieSeasonNumber}`;
        const googleSearchUrl = `${googleSearchUrlBase}${encodeURIComponent(googleSearch)}`;

        Logger.debug(`Google Search : '${googleSearch}'`);

        const dom = await this.webCache.get(googleSearchUrl, async (googleSearchUrl) => {
            Logger.debug(`Get "${googleSearchUrl}"`);
            const response = await fetch(googleSearchUrl, { method: `GET`, headers: getHeaders(googleSearchUrl, googleSearchUrl) });
            const html = await response.text();
            return new JSDOM(html);
        });

        const nodes = dom.window.document.querySelectorAll(`a[href*='https://www.allocine.fr/series/ficheserie-']`);
        const allocineSeasonUrlRegex = /^(https:\/\/www.allocine.fr\/series\/ficheserie-(\d+)\/saison-(\d+)).*?(\?.+?)?(#.+?)?$/i;

        // Get urls and remove duplicates
        const urls = [];
        for (const node of nodes) {
            let url = node.href;
            if (url != null && url.length > 0) {
                const allocineSeasonUrlMatchResult = url.match(allocineSeasonUrlRegex);
                if (allocineSeasonUrlMatchResult && allocineSeasonUrlMatchResult.length > 1) {
                    const allocineSeasonUrl = allocineSeasonUrlMatchResult[1];
                    if (alreadyProcessedSeries[allocineSeasonUrl] == null) {
                        alreadyProcessedSeries[allocineSeasonUrl] = 1;
                        urls.push(allocineSeasonUrl);
                    }
                }
            }
        }

        const matches = [];
        for (const url of urls) {
            try {
                const allocineSeasonUrlMatchResult = url.match(allocineSeasonUrlRegex);
                if (!allocineSeasonUrlMatchResult || allocineSeasonUrlMatchResult.length < 3) {
                    continue;
                }

                const allocineSeasonId = allocineSeasonUrlMatchResult[2];

                const infos = {
                    ...commonInfos,
                    ...serieInfos,
                    'EpisodeNumber': serieEpisodeNumber,
                    'EpisodeFinal': (serieEpisodeFinal && serieEpisodeFinal.length ? 'FINAL' : ''),
                    'GoogleSearch': googleSearch,
                    'OriginalFileName': originalFileName,
                    'Referer': googleSearchUrl ?? `https://www.google.com/search?q=serie`,
                    'SeasonNumber': serieSeasonNumber,
                    'SeasonUrl': url,
                    'Title': serieTitle,
                    'Url': `https://www.allocine.fr/series/ficheserie_gen_cserie=${allocineSeasonId}.html`,
                };

                this.extractFileInfos(infos);

                const dom = await this.fetchData(infos['Url'], infos.Referer);

                this.extractInfos(dom, infos);

                const domEpisode = await this.fetchData(infos['SeasonUrl'], infos.Referer);

                this.extractImage(domEpisode, infos);

                this.extractEpisodeInfos(domEpisode, infos);

                if (infos != null) {
                    infos.MatchScore = this.computeTitleMatchScore(serieTitle, infos.Title, infos.OriginalTitle);

                    if (infos.MatchScore >= minMatchThreshold) {
                        Logger.debug(`Match ${infos.MatchScore.toFixed(2)} : "${infos.Title}"`);

                        matches.push(infos);

                        if (infos.MatchScore >= bestMatchThreshold) {
                            break;
                        }
                    }
                }
            }
            catch (error) {
                if (error != null && error.response != null) {
                    Logger.error(`Error : ${error.name} ${error.message} ${error.response.text()}`);
                }
                else {
                    Logger.error('Error :', error);
                }
            }
        }

        bestMatch = matches.reduce((bestMatch, currentMatch) => (currentMatch.MatchScore > bestMatch.MatchScore ? currentMatch : bestMatch), bestMatch);

        Logger.info(`Best match ${bestMatch.MatchScore.toFixed(2)} : "${bestMatch.Title}"`);

        await sleep(500);

        return (bestMatch.MatchScore >= minMatchThreshold ? bestMatch : null);
    }

    extractInfos(dom, infos) {
        this.extractTitle(dom, infos);
        this.extractOriginalTitle(dom, infos);
        this.extractCreators(dom, infos);
        this.extractSynopsis(dom, infos);
        this.extractDuration(dom, infos);
        this.extractGenres(dom, infos);
        this.extractDate(dom, infos);
        return infos;
    }

    extractTitle(dom, infos) {
        infos[`Title`] = dom.window.document.querySelector(`div.titlebar-title>span`).textContent.trim();
        return infos;
    }

    extractOriginalTitle(dom, infos) {
        const originalTitleNode = dom.window.document.querySelector(`div.meta-body-original-title`);
        if (originalTitleNode != null && originalTitleNode.textContent != null && originalTitleNode.textContent.length > 0) {
            const originalTitleText = originalTitleNode.textContent.trim();
            const originalTitleTextResult = originalTitleText.match(/^(\s*Titre\s*original\s*:\s*)?(.+)\s*$/i);
            if (originalTitleTextResult != null && originalTitleTextResult.length > 2) {
                infos[`OriginalTitle`] = originalTitleTextResult[2].trim();
            }
        }
        if ((infos[`OriginalTitle`] == null || infos[`OriginalTitle`].length == 0) && infos[`Title`] != null && infos[`Title`].length > 0) {
            infos[`OriginalTitle`] = infos[`Title`];
        }
        return infos;
    }

    extractCreators(dom, infos) {
        const creatorNodes = dom.window.document.querySelectorAll(`div.meta-body-direction>a`);
        if (creatorNodes) {
            const creators = [];
            for (let creatorNode of creatorNodes) {
                if (creatorNode) {
                    creators.push(creatorNode.textContent.trim());
                }
            }
            infos[`Creators`] = creators.join(', ');
        }
        return infos;
    }

    extractSynopsis(dom, infos) {
        const synopsisNode = dom.window.document.querySelector(`section#synopsis-details>div.content-txt`);
        if (synopsisNode) {
            infos[`Synopsis`] = removeHtmlTags(synopsisNode.textContent.trim());
        }
        return infos;
    }

    extractDuration(dom, infos) {
        const metaInfoNode = dom.window.document.querySelector(`div.meta>div.meta-body>div.meta-body-item.meta-body-info`);
        if (metaInfoNode) {
            const matchScoreMatchResult = metaInfoNode.textContent.match(/\d+\s?h\s+\d+\s?min|\d+\s?h|\d+\s?min/i);
            if (matchScoreMatchResult && matchScoreMatchResult.length > 0) {
                infos[`Duration`] = matchScoreMatchResult[0];
            }
        }
        return infos;
    }

    extractGenres(dom, infos) {
        const metaInfoNodes = dom.window.document.querySelectorAll(`div.meta>div.meta-body>div.meta-body-item.meta-body-info>span.dark-grey-link`);
        if (metaInfoNodes) {
            const genres = [];
            for (const metaInfoNode of metaInfoNodes) {
                genres.push(metaInfoNode.textContent.trim());
            }
            if (genres.length > 0) {
                infos[`Genres`] = genres.join(`, `);
            }
        }
        return infos;
    }

    extractDate(dom, infos) {
        const dateNode = dom.window.document.querySelector(`div.meta-body-info`);
        if (dateNode) {
            const dateParts = dateNode.textContent.match(/(?:(?:(\d{1,2})\s+)?(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+)?(\d{4})/i);
            if (dateParts) {
                infos[`Date`] = dateParts[0];
                if (dateParts) {
                    if (dateParts.length > 1 && dateParts[1]) {
                        infos[`Day`] = dateParts[1];
                    }
                    if (dateParts.length > 2 && dateParts[2]) {
                        infos[`Month`] = dateParts[2];
                    }
                    if (dateParts.length > 3 && dateParts[3]) {
                        infos[`Year`] = dateParts[3];
                    }
                }
            }
        }
        return infos;
    }

    extractImage(dom, infos) {
        const imageNode = dom.window.document.querySelector(`div.season-thumb>figure.thumbnail>div.thumbnail-container>img.thumbnail-img`);
        if (imageNode) {
            const imageUrl = /^https?:\/\/.+/i.test(imageNode.src) ? imageNode.src : imageNode.getAttribute('data-src');
            if (/^https?:\/\/.+/i.test(imageUrl)) {
                infos[`ImageUrl`] = imageUrl;
                infos[`ImageExtension`] = infos[`ImageUrl`].split(`.`).pop();
            }
        }
        return infos;
    }

    extractEpisodeInfos(dom, infos) {
        const episodeTitleNodes = Array.from(dom.window.document.querySelectorAll(`div.meta>div.meta-title`));
        const episodeTitleRegExp = /^\W*S(\d+)\W*E\W*(\d+)\W*(.*)\s*$/i;
        const seasonNumber = parseInt(infos[`SeasonNumber`]);
        const episodeNumber = parseInt(infos[`EpisodeNumber`]);
        for (const episodeTitleNode of episodeTitleNodes) {
            const episodeTitleRegExpRes = episodeTitleNode.textContent.match(episodeTitleRegExp);
            if (episodeTitleRegExpRes && episodeTitleRegExpRes[1] == seasonNumber && episodeTitleRegExpRes[2] == episodeNumber) {
                infos[`EpisodeTitle`] = episodeTitleRegExpRes[3].trim();
                const episodeSynopsisNode = episodeTitleNode.parentNode.parentNode.querySelector(`div.content-txt.synopsis`);
                if (episodeSynopsisNode != null) {
                    infos[`EpisodeSynopsis`] = episodeSynopsisNode.textContent.trim();
                }
                infos[`SeasonNumber`] = episodeTitleRegExpRes[1];
                infos[`EpisodeNumber`] = episodeTitleRegExpRes[2];
                break;
            }
        }
        return infos;
    }
}
