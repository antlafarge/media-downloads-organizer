export default class Cache
{
    constructor()
    {
        this.reset();
    }

    reset()
    {
        this.cache = {};
    }

    get(id, asyncCallback, ms = null)
    {
        let now = Date.now();
        let cachedData = this.cache[id];
        if (cachedData === undefined || now > cachedData.time)
        {
            cachedData = this.cache[id] = {
                id: id,
                data: asyncCallback(id),
                time: (ms == null ? +Infinity : now + ms)
            };
        }
        return cachedData.data;
    }
}
