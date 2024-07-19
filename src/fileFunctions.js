import fs from "fs/promises";
import path from "path";

import Logger from "./logger.js";
import { getHeaders } from "./webFunctions.js";

async function downloadFile(fileUrl, referer, targetFilePath)
{
    Logger.info(`Download "${fileUrl}"`);
    const response = await fetch(fileUrl, { method: `GET`, headers: getHeaders(fileUrl, referer) });
    const buffer = await response.arrayBuffer();
    await fs.writeFile(targetFilePath, new DataView(buffer));
}

function removeInvalidPathCharacters(filePath)
{
    return filePath
        .replace(/[\\\/:|]/g, '-')
        .replace(/["*]/, "'")
        .replace('?', '')
        .replace('<', "{")
        .replace('>', "}");
}

function fileExists(filePath)
{
    return fs.stat(filePath).then(() => true).catch(() => false);
}

async function getFileSize(filePath)
{
    return await fs.stat(filePath).then((value) => value.size).catch(() => 0);
}

async function* getFiles(dir, relativeDirPath = ``)
{
    try
    {
        const dirents = await fs.readdir(dir, { withFileTypes: true });
        for (const dirent of dirents)
        {
            const res = path.resolve(dir, dirent.name);
            if (dirent.isDirectory())
            {
                yield* getFiles(res, `${relativeDirPath}${dirent.name}/`);
            }
            else
            {
                yield {
                    'absoluteFilePath': res,
                    'relativeDirPath': relativeDirPath,
                    'fileName': dirent.name,
                    'relativeFilePath': `${relativeDirPath}${dirent.name}`,
                    'size': await getFileSize(res)
                };
            }
        }
    }
    catch (error)
    {
        Logger.error('"fs.readdir" failed :', error);
    }
}

export { downloadFile, removeInvalidPathCharacters, fileExists, getFileSize, getFiles };
