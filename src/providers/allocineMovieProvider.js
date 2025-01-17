import fetch from "node-fetch";
import { JSDOM } from "jsdom";

import commonInfos from "../../res/commonInfos.json" with { type: "json" };
import movieInfos from "../../res/movieInfos.json" with { type: "json" };
import Logger from "../logger.js";
import { sleep } from "../async.js";
import { getHeaders } from "../webFunctions.js";
import Provider from '../provider.js';

const minMatchThreshold = 0.5;
const bestMatchThreshold = 1.0;

export default class AllocineMovieProvider extends Provider {
    constructor() {
        super();
    }

    name() {
        return `AllocineMovieProvider`;
    }

    async getInfos(originalFileName) {
        this.webCache.reset();

        const googleSearchUrlBase = `https://www.google.com/search?q=`;

        let searchStr = null;

        // We try to extract the possible year and more precise title of the movie
        const searchMatchResult = originalFileName.trim().match(/^((?:.+)\W(\d{4}))(?:\W.*)|$/);
        if (searchMatchResult && searchMatchResult.length > 0) {
            const possibleYear = searchMatchResult[2];

            const minYear = 1895;
            const maxYear = (new Date()).getFullYear() + 1;

            // If the year looks correct
            if (possibleYear != null && possibleYear >= minYear && possibleYear <= maxYear) {
                searchStr = searchMatchResult[1];
            }
        }

        if (searchStr == null) {
            searchStr = originalFileName.replace(/\.\w+?$/, ``);
        }

        let bestMatch = { MatchScore: -Infinity };
        const alreadyProcessedMovieUrls = {};

        const searchWords = searchStr.match(/\w+/g);
        const googleSearch = `site:allocine.fr film ${searchWords.join(` `)}`;
        const googleSearchUrl = `${googleSearchUrlBase}${encodeURIComponent(googleSearch)}`;

        Logger.debug(`Google Search : '${googleSearch}'`);

        const dom = await this.webCache.get(googleSearchUrl, async (googleSearchUrl) => {
            Logger.debug(`Get "${googleSearchUrl}"`);
            const response = await fetch(googleSearchUrl, { method: `GET`, headers: getHeaders(googleSearchUrl, googleSearchUrl) });
            const html = await response.text();
            return new JSDOM(html);
        });

        const nodes = dom.window.document.querySelectorAll(`a[href*='https://www.allocine.fr/film/fichefilm_gen_cfilm=']`);

        // Get movie urls and remove duplicates
        const movieUrls = [];
        for (const node of nodes) {
            const url = node.href;
            if (url != null && url.length > 0) {
                const movieUrl = url.match(/^(.+?)([\?#].*|$)/)[1];
                if (alreadyProcessedMovieUrls[movieUrl] == null) {
                    alreadyProcessedMovieUrls[movieUrl] = 1;
                    movieUrls.push(movieUrl);
                }
            }
        }

        const matches = [];
        for (const movieUrl of movieUrls) {
            try {
                const infos = {
                    ...commonInfos,
                    ...movieInfos,
                    'GoogleSearch': googleSearch,
                    'OriginalFileName': originalFileName,
                    'Referer': googleSearchUrl ?? `https://www.google.com/search?q=movie`,
                    'Url': movieUrl,
                };

                this.extractFileInfos(infos);

                const dom = await this.fetchData(infos.Url, infos.Referer);

                this.extractInfos(dom, infos);

                infos.MatchScore = this.computeTitleMatchScore(searchStr, infos.Title, infos.OriginalTitle, infos.Year);

                if (infos.MatchScore >= minMatchThreshold) {
                    Logger.log(`Match ${infos.MatchScore.toFixed(2)} : "${infos.Title}"`);

                    matches.push(infos);

                    if (infos.MatchScore >= bestMatchThreshold) {
                        break;
                    }
                }
            }
            catch (error) {
                if (error != null && error.response != null) {
                    Logger.error(`Error: ${error.name} ${error.message} ${error.response.text()}`);
                }
                else {
                    Logger.error('Error :', error);
                }
            }
        }

        bestMatch = matches.reduce((bestMatch, currentMatch) => (currentMatch.MatchScore > bestMatch.MatchScore ? currentMatch : bestMatch), bestMatch);

        Logger.info(`Best match ${bestMatch.MatchScore.toFixed(2)} : "${bestMatch.Title}"`);

        await sleep(200);

        return (bestMatch.MatchScore >= minMatchThreshold) ? bestMatch : null;
    }

    extractInfos(dom, infos) {
        this.extractTitle(dom, infos);
        this.extractOriginalTitle(dom, infos);
        this.extractDirectors(dom, infos);
        this.extractCreators(dom, infos);
        this.extractSynopsis(dom, infos);
        this.extractDuration(dom, infos);
        this.extractGenres(dom, infos);
        this.extractDate(dom, infos);
        this.extractImage(dom, infos);
        return infos;
    }

    extractTitle(dom, infos) {
        infos[`Title`] = dom.window.document.querySelector(`div.titlebar-title`).textContent.trim();
        return infos;
    }

    extractOriginalTitle(dom, infos) {
        const originalTitlesNodes = Array.from(dom.window.document.querySelectorAll(`div.meta>div.meta-body>div.meta-body-item>span`));
        for (const originalTitleIndex in originalTitlesNodes) {
            const originalTitleNode = originalTitlesNodes[originalTitleIndex];
            if (/Titre\s+?original/i.test(originalTitleNode.textContent) && originalTitleIndex <= originalTitlesNodes.length) {
                const originalTitleNode2 = originalTitlesNodes[parseInt(originalTitleIndex) + 1];
                infos[`OriginalTitle`] = originalTitleNode2.textContent.trim();;
                break;
            }
        }
        if ((infos[`OriginalTitle`] == null || infos[`OriginalTitle`].length == 0) && infos[`Title`] != null && infos[`Title`].length > 0) {
            infos[`OriginalTitle`] = infos[`Title`];
        }
        return infos;
    }

    extractDirectors(dom, infos) {
        const directorNodes = dom.window.document.querySelectorAll(`div.meta-body-direction`);
        if (directorNodes && directorNodes.length > 0) {
            for (const directorNode of directorNodes) {
                if (directorNode && directorNode.textContent && directorNode.textContent.length > 0) {
                    const directorMatchResult = directorNode.textContent.replace(/\n/g, ' ').match(/^\s*De\s+(.+?)\s*$/i);
                    if (directorMatchResult && directorMatchResult.length > 0) {
                        infos[`Directors`] = directorMatchResult[1];
                        break;
                    }
                }
            }
        }
        return infos;
    }

    extractCreators(dom, infos) {
        const creatorNodes = dom.window.document.querySelectorAll(`div.meta-body-direction`);
        if (creatorNodes && creatorNodes.length > 0) {
            for (const creatorNode of creatorNodes) {
                if (creatorNode && creatorNode.textContent && creatorNode.textContent.length > 0) {
                    const creatorMatchResult = creatorNode.textContent.replace(/[\n\s]+/g, ' ').match(/^\s*Par\s+(.+?)\s*$/i);
                    if (creatorMatchResult && creatorMatchResult.length > 0) {
                        infos[`Creators`] = creatorMatchResult[1];
                        break;
                    }
                }
            }
        }
        return infos;
    }

    extractSynopsis(dom, infos) {
        const synopsisNodes = dom.window.document.querySelectorAll(`section#synopsis-details>div.content-txt>p`);
        if (synopsisNodes) {
            const synopsis = [];
            for (const synopsisNode of synopsisNodes) {
                synopsis.push(synopsisNode.textContent.trim());
            }
            if (synopsis.length > 0) {
                infos[`Synopsis`] = synopsis.join(` `);
            }
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
        const imageNode = dom.window.document.querySelector(`figure.thumbnail img.thumbnail-img`);
        if (imageNode) {
            const imageUrl = /^https?:\/\/.+/i.test(imageNode.src) ? imageNode.src : imageNode.getAttribute('data-src');
            if (/^https?:\/\/.+/i.test(imageUrl)) {
                infos[`ImageUrl`] = imageUrl;
                infos[`ImageExtension`] = infos[`ImageUrl`].split(`.`).pop();
            }
        }
        return infos;
    }
    /*
        async getMovieInfosUseAllocineApi(originalFileName)
        {
            //return await getGoogleResultsAllocine(originalFileName);
    
            //const infosTmp = await getMovieInfosAllocine(infos.MovieUrl, originalFileName, infos.Referer, infos.GoogleSearch);
    
            const urlParts = [
                "partner=QUNXZWItQWxsb0Npbuk",
                "format=json",
                "filter=movie",
                "count=10",
                `q=movieNameHere`
            ];
            const url = `http://api.allocine.fr/rest/v3/search?${urlParts.join(`&`)}`;
            
            const dom = await this.webCache.get(url, async (url) =>
            {
                Logger.info(`Get "${url}"`);
                const response = await fetch(url, { method: `GET`, headers: getHeaders(url, url) });
                if (! response.ok)
                {
                    const error = new Error(`HTTP Error Response: ${response.status} ${response.statusText}`);
                    error.response = response;
                    throw error;
                }
                const html = await response.text();
                return new JSDOM(html);
            });
    
            console.log(dom);
        }
    */
}
