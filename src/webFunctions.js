function removeHtmlDoubleTags(text) {
    return text.replace(/<\w+\s*(\s+?\w+?(\s*=\s*(""|"[^\\]"|".+?[^\\]"))?)*\s*\/?>.+?<\/?\w+\s*>/g, ``);
}

function removeHtmlTags(text) {
    return text.replace(/<\/?\w+\s*(\s+?\w+?(\s*=\s*(""|"[^\\]"|".+?[^\\]"))?)*\s*\/?>/g, ``);
}

function getHeaders(url, referer) {
    if (url == null) {
        throw new Error(`getHeaders: Invalid URL`);
    }

    const host = url.replace(/^(https?:\/\/)?(.+?)(\/.*)?$/i, `$2`);
    referer = referer ? referer.replace(/^(https?:\/\/)?(.+?)(\/.*)?$/i, `$1$2/`) : ``;
    const headers =
    {
        'Accept': `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8`,
        'Accept-Encoding': `gzip, deflate, br`,
        'Accept-Language': `fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3`,
        'Alt-Used': host,
        'Host': host,
        'Referer': referer,
        'Sec-Fetch-Dest': `document`,
        'Sec-Fetch-Mode': `navigate`,
        'Sec-Fetch-Site': `same-origin`,
        'Sec-Fetch-User': `?1`,
        'TE': `trailers`,
        'Upgrade-Insecure-Requests': 1,
        'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0`
    };
    return headers;
}

export { removeHtmlDoubleTags, removeHtmlTags, getHeaders };
