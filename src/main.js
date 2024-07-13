import { performance } from "perf_hooks";
import fs from "fs/promises";

import Logger from "./logger.js";
import { sleep } from "./async.js";
import { getFileSizeReadable, getTimeReadable } from './functions.js';
import { downloadFile, removeInvalidPathCharacters, fileExists, getFileSize, getFiles } from './fileFunctions.js';

Logger.minLogLevel = (process.env.MinLogLevel != null ? Logger.LogLevel[process.env.MinLogLevel] : Logger.LogLevel.LOG);

const outputMoviePattern = process.env.OutputMoviePattern ?? `<OriginalFileTitle>.<Extension>`;
const targetMovieImagePattern = outputMoviePattern.replace(`<Extension>`, `<ImageExtension>`);
const targetMovieInfoPattern = outputMoviePattern.replace(`<Extension>`, `json`);
const outputSeriePattern = process.env.OutputSeriePattern ?? `<OriginalFileTitle>.<Extension>`;
const targetSerieImagePattern = outputSeriePattern.replace(`<Extension>`, `<ImageExtension>`);
const targetSerieInfoPattern = outputSeriePattern.replace(`<Extension>`, `json`);
const scanFileExtensions = process.env.ScanFileExtensions ?? `mkv|avi|mp4|m4[vp]|og[gv]|flv|wmv|webm|mov|avchd|ts|mpe?g|3gp`;
const scanFileExtensionsRE = new RegExp(`.+\.(${scanFileExtensions})$`, `i`);

const movieProviderId = process.env.MovieProvider ?? 'allocineMovieProvider';
const movieProviderExport = await import(`../src/providers/${movieProviderId}.js`);
const MovieProvider = movieProviderExport.default;
const movieProvider = new MovieProvider();

const serieProviderId = process.env.SerieProvider ?? 'allocineMovieProvider';
const serieProviderExport = await import(`../src/providers/${serieProviderId}.js`);
const SerieProvider = serieProviderExport.default;
const serieProvider = new SerieProvider();

const ignoreTag = `.mdo-ignore`;

const downloadsPath = `./downloads`;
const moviesPath = `./movies`;
const seriesPath = `./series`;

let lastDownloadSpeedBytesPerMs = 0;

await main();

async function main()
{
    if (! await fileExists(moviesPath))
    {
        Logger.error(`Target directory "./movies" not found`);
        process.exit(1);
    }

    if (! await fileExists(seriesPath))
    {
        Logger.error(`Target directory "./series" not found`);
        process.exit(1);
    }
    
    let noChanges = true;

    for await (const file of getFiles(downloadsPath))
    {
        Logger.group(`Process ${file.relativeFilePath}`);
        
        if (! scanFileExtensionsRE.test(file.fileName))
        {
            Logger.info('Skip: file extension ');
            continue;
        }
        
        if (file.fileName.endsWith(ignoreTag))
        {
            Logger.debug(`Skip ignore file "${file.relativeFilePath}"`);
            continue;
        }

        const originalFilePath = `${downloadsPath}/${file.relativeFilePath}`;

        if (await fileExists(`${originalFilePath}${ignoreTag}`))
        {
            Logger.debug(`Skip already ignored file "${file.relativeFilePath}"`);
            continue;
        }
        
        let infos;
        let targetPath;
        if (/^(.+)\WS\W*(\d+)\W*E\W*(\d+)(\W|$)/i.test(file.fileName))
        {
            Logger.group('Get serie infos');
            infos = await serieProvider.getInfos(file.fileName);
            if (infos != null)
            {
                infos[`TargetFileName`] = generateFileName(infos, outputSeriePattern);
                infos[`TargetInfosFileName`] = generateFileName(infos, targetSerieInfoPattern);
                infos[`TargetImageFileName`] = generateFileName(infos, targetSerieImagePattern);
                targetPath = seriesPath;
            }
        }
        else
        {
            Logger.group('Get movie infos');
            infos = await movieProvider.getInfos(file.fileName);
            if (infos != null)
            {
                infos[`TargetFileName`] = generateFileName(infos, outputMoviePattern);
                infos[`TargetInfosFileName`] = generateFileName(infos, targetMovieInfoPattern);
                infos[`TargetImageFileName`] = generateFileName(infos, targetMovieImagePattern);
                targetPath = moviesPath;
            }
        }
        Logger.groupEnd();

        if (infos == null)
        {
            Logger.info(`No match found`);
            ignoreDownloadedFile(originalFilePath);
            Logger.groupEnd();
            await sleep(1000);
            continue;
        }
        
        const targetFilePath = `${targetPath}/${infos[`TargetFileName`]}`;
        const targetInfosFilePath = `${targetPath}/${infos[`TargetInfosFileName`]}`;
        const targetImageFilePath = `${targetPath}/${infos[`TargetImageFileName`]}`;
        
        if (await fileExists(targetFilePath))
        {
            Logger.warn(`File already exists "${infos[`TargetFileName`]}"`);
            ignoreDownloadedFile(originalFilePath);
            Logger.groupEnd();
            await sleep(1000);
            continue;
        }

        const pathMatchResult = infos[`TargetFileName`].match(/^(.+)[\/\\].+?$/);
        if (pathMatchResult && pathMatchResult[1].length > 0)
        {
            Logger.debug(`Create directory "${pathMatchResult[1]}"`);
            try
            {
                await fs.mkdir(`${targetPath}/${pathMatchResult[1]}`, { recursive: true });
            }
            catch (error)
            {
                Logger.warn('Create directory failed :', error);
                Logger.groupEnd();
                await sleep(1000);
                continue;
            }
        }
        
        if (! await fileExists(targetImageFilePath) && infos[`ImageUrl`] != null && infos[`ImageUrl`].length > 0)
        {
            Logger.group(`Image "${infos[`TargetImageFileName`]}"`);
            try
            {
                await downloadFile(infos[`ImageUrl`], infos[`Referer`], targetImageFilePath);
            }
            catch (error)
            {
                Logger.warn('Create image file failed :', error);
                Logger.groupEnd();
                Logger.groupEnd();
                await sleep(1000);
                continue;
            }
            Logger.groupEnd();
        }
        else
        {
            Logger.warn(`File already exists "${infos[`TargetImageFileName`]}"`);
        }

        if (! await fileExists(targetInfosFilePath))
        {
            Logger.info(`Infos "${infos[`TargetInfosFileName`]}"`);
            try
            {
                await fs.writeFile(targetInfosFilePath, JSON.stringify(infos, null, 2));
            }
            catch (error)
            {
                Logger.error('Create infos file failed :', error);
                Logger.groupEnd();
                await sleep(1000);
                continue;
            }
        }
        else
        {
            Logger.warn(`File already exists "${infos[`TargetInfosFileName`]}"`);
        }
        
        Logger.group(`Copy "${infos[`TargetFileName`]}"`);
        const fileSize = await getFileSize(originalFilePath);
        Logger.info(`File size : ${getFileSizeReadable(fileSize)}`);
        if (lastDownloadSpeedBytesPerMs > 0)
        {
            const estimatedTimeMs = Math.round((fileSize / lastDownloadSpeedBytesPerMs) * 1.1);
            Logger.info(`Estimated time : ${getTimeReadable(estimatedTimeMs)}`);
        }
        const t0 = performance.now();
        try
        {
            await fs.copyFile(originalFilePath, targetFilePath);
        }
        catch (error)
        {
            Logger.error('Copy failed:', error);
            Logger.groupEnd();
            Logger.groupEnd();
            await sleep(1000);
            continue;
        }
        const t1 = performance.now();
        lastDownloadSpeedBytesPerMs = fileSize / (t1 - t0);
        Logger.debug(`Last download speed : ${getFileSizeReadable(lastDownloadSpeedBytesPerMs)} per millisecond`);

        if (await fileExists(originalFilePath))
        {
            Logger.info(`Remove "${originalFilePath}"`);
            try
            {
                await fs.rm(originalFilePath);
            }
            catch (error)
            {
                Logger.error('Remove media file failed :', error);
                Logger.groupEnd();
                Logger.groupEnd();
                await sleep(1000);
                continue;
            }
        }
        Logger.groupEnd();

        noChanges = false;
        Logger.groupEnd();
        await sleep(1000);
    }
    
    if (noChanges)
    {
        Logger.info(`No changes`);
    }
    else
    {
        Logger.info(`Done`);
    }
}

async function ignoreDownloadedFile(filePath)
{
    Logger.info(`Ignore file`, `"${filePath}"`);
    await fs.writeFile(`${filePath}${ignoreTag}`, `https://hub.docker.com/r/antlafarge/media-downloads-organizer\nhttps://github.com/antlafarge/media-downloads-organizer\nCan't process this media file for one of these reasons :\n- Media match not found on the selected provider.\n- The media file is already present in the destination folder.\nTo retry follow these steps :\n- Check if the media is already present in the destination folder.\n- Rename the media file by adding the official media title and the release year on start if it is not correct.\n- Remove this file.\n- Restart media-downloads-organizer.`);
}

function generateFileName(infos, pattern)
{
    // Generate filename from pattern
    const parts = pattern.match(/<[^<>\W_]+?>/g);
    let targetName = pattern;
    for (const part of parts)
    {
        const partName = part.slice(1, -1);
        if (partName.length > 0)
        {
            let value = '';
            if (infos[partName] != null)
            {
                // Remove invalid path characters
                value = removeInvalidPathCharacters(infos[partName]);
            }
            targetName = targetName.replace(`${part}`, value);
        }
    }
    // Remove starting .
    while (targetName.startsWith('.'))
    {
        targetName = targetName.slice(1);
    }
    // Remove ending .
    while (targetName.endsWith('.'))
    {
        targetName = targetName.slice(0, -1);
    }
    // Remove space(s) before .ext
    const res = targetName.match(/\s+(\.\w+)$/);
    if (res)
    {
        targetName = targetName.replace(/\s+(\.\w+)$/, `${res[1]}`);
    }
    // Remove double spaces
    return targetName.replace(/\s{2,}/g, ' ').trim();
}
