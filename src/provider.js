import { JSDOM } from "jsdom";

import Cache from "./cache.js";
import Logger from "./logger.js";
import { getHeaders } from "./webFunctions.js";
import audioCodecs from "../res/audioCodecs.json" with { type: "json" };
import audioQualities from "../res/audioQualities.json" with { type: "json" };
import videoCodecs from "../res/videoCodecs.json" with { type: "json" };
import videoQualities from "../res/videoQualities.json" with { type: "json" };
import languages from "../res/languages.json" with { type: "json" };

export default class Provider
{
    webCache = new Cache();

    constructor()
    {
    }

    name()
    {
        return `EmptyProvider`;
    }
    
    async getInfos(originalFileName)
    {
        const infos = null;
        return infos;
    }

    async fetchData(url, refererUrl)
    {
        const dom = await this.webCache.get(url, async (url) =>
        {
            Logger.debug(`Get "${url}"`);
            const response = await fetch(url, { method: `GET`, headers: getHeaders(url, refererUrl) });
            if (!response.ok)
            {
                const error = new Error(`HTTP Error Response: ${response.status} ${response.statusText}`);
                error.response = response;
                throw error;
            }
            const html = await response.text();
            return new JSDOM(html);
        });

        return dom;
    }

    extractInfos(data, infos)
    {
        return infos;
    }
    
    extractFileInfos(infos)
    {
        const { OriginalFileName: originalFileName } = infos;

        const originalFileNameParts = originalFileName.split(`.`);
        if (originalFileNameParts.length >= 2)
        {
            infos[`Extension`] = originalFileNameParts.pop();
        }
        infos[`OriginalFileTitle`] = originalFileNameParts.join(`.`);

        for (const item of audioCodecs)
        {
            const res = originalFileName.match(new RegExp(`.+\\W+(${item})\\W+.+?$`, `i`));
            if (res && res.length > 1)
            {
                infos[`AudioCodec`] = res[1];
                break;
            }
        }

        for (const item of audioQualities)
        {
            const res = originalFileName.match(new RegExp(`.+\\W+(${item})\\W+.+?$`, `i`));
            if (res && res.length > 1)
            {
                infos[`AudioQuality`] = res[1];
                break;
            }
        }

        for (const item of videoCodecs)
        {
            const res = originalFileName.match(new RegExp(`.+\\W+(${item})\\W+.+?$`, `i`));
            if (res && res.length > 1)
            {
                infos[`VideoCodec`] = res[1];
                break;
            }
        }
    
        for (const item of videoQualities)
        {
            const res = originalFileName.match(new RegExp(`.+\\W+(${item})\\W+.+?$`, `i`));
            if (res && res.length > 1)
            {
                infos[`VideoQuality`] = res[1];
                break;
            }
        }

        for (const item of languages)
        {
            const res = originalFileName.match(new RegExp(`.+\\W+(${item})\\W+.+?$`, `i`));
            if (res && res.length > 1)
            {
                infos[`Language`] = res[1];
                break;
            }
        }
        
        return infos;
    }

    extractTitle(data, infos)
    {
        return infos;
    }

    extractOriginalTitle(data, infos)
    {
        return infos;
    }
    
    extractDirectors(data, infos)
    {
        return infos;
    }

    extractCreators(data, infos)
    {
        return infos;
    }

    extractSynopsis(data, infos)
    {
        return infos;
    }

    extractDuration(data, infos)
    {
        return infos;
    }

    extractGenres(data, infos)
    {
        return infos;
    }

    extractDate(data, infos)
    {
        return infos;
    }

    extractImage(data, infos)
    {
        return infos;
    }

    computeTitleMatchScore(fileTitle, webTitle, webOriginalTitle = null, year = null)
    {
        if (year != null && year.length > 0)
        {
            if (webTitle != null && webTitle.length > 0)
            {
                webTitle += ` ${year}`;
            }
            if (webOriginalTitle != null && webOriginalTitle.length > 0)
            {
                webOriginalTitle += ` ${year}`;
            }
        }
        const fileParts = fileTitle.toLowerCase().match(/\w+/g);
        const webParts = webTitle.toLowerCase().match(/\w+/g);
        const webOriginalParts = webOriginalTitle ? webOriginalTitle.toLowerCase().match(/\w+/g) : [];
        let count = 0;
        let countOriginal = 0;
        for (const filePart of fileParts)
        {
            if (webParts.includes(filePart))
            {
                count++;
            }
            if (webOriginalParts.includes(filePart))
            {
                countOriginal++;
            }
        }
        for (const webPart of webParts)
        {
            if (fileParts.includes(webPart))
            {
                count++;
            }
        }
        for (const webOriginalPart of webOriginalParts)
        {
            if (fileParts.includes(webOriginalPart))
            {
                countOriginal++;
            }
        }
        const ratio = count / (fileParts.length + webParts.length);
        const ratioOriginal = countOriginal / (fileParts.length + webOriginalParts.length);
        const takenRatio = Math.max(ratio, ratioOriginal);
        Logger.debug(`computeTitleMatchScore(fileTitle:"${fileTitle}", webTitle:"${webTitle}", webOriginalTitle:"${webOriginalTitle}")`, `Ratio=${takenRatio}`, `(title:${count}/${fileParts.length + webParts.length})`, `(originalTitle:${countOriginal}/${fileParts.length + webOriginalParts.length})`);
        return takenRatio;
    }
}
