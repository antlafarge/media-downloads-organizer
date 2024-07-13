// logger.js v0.3

export default class Logger
{
    static LogLevel =
    {
        TEMP: 0, // Temporary information, will be removed from the logs when there is another log to display
        DEBUG: 1, // Detailed information, useful for debugging
        LOG: 2, // Normal information
        INFO: 3, // Relevant information
        WARNING: 4, // Something abnormal happened
        ERROR: 5, // Error occured
        NOTHING: 6 // Nothing is displayed, don't use it as a LogLevel in a log
    };

    static #LogLevelStr =
    {
        0: `Tmp`,
        1: `Dbg`,
        2: `Log`,
        3: `Nfo`,
        4: `WRN`,
        5: `ERR`,
        6: `   `
    }

    static minLogLevel = Logger.LogLevel.DEBUG;
    static #progressStarted = false;
    static #groupsLevel = 0;

    // Log temporary messages (replaced by next message on tty, ignored overwise)
    static temp(...messages)
    {
        if (process && process.stdout && process.stdout.isTTY)
        {
            if (Logger.#progressStarted)
            {
                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
            }
            Logger.#progressStarted = true;
            process.stdout.write(`${Logger.#createLogHeader(Logger.LogLevel.TEMP)} ${Array.prototype.join.call(messages, ' ')}`);
        }
    }

    // Log debug messages
    static debug(...messages)
    {
        if (Logger.minLogLevel > Logger.LogLevel.DEBUG)
        {
            Logger.temp(...messages);
            return;
        }
        Logger.#tempEnd();
        console.debug(Logger.#createLogHeader(Logger.LogLevel.DEBUG), ...messages);
    }

    // Log normal messages
    static log(...messages)
    {
        if (Logger.minLogLevel > Logger.LogLevel.LOG)
        {
            Logger.temp(...messages);
            return;
        }
        Logger.#tempEnd();
        console.log(Logger.#createLogHeader(Logger.LogLevel.LOG), ...messages);
    }

    // Log relevant messages
    static info(...messages)
    {
        if (Logger.minLogLevel > Logger.LogLevel.INFO)
        {
            Logger.temp(...messages);
            return;
        }
        Logger.#tempEnd();
        console.info(Logger.#createLogHeader(Logger.LogLevel.INFO), ...messages);
    }

    // Log warning messages
    static warn(...messages)
    {
        if (Logger.minLogLevel > Logger.LogLevel.WARNING)
        {
            Logger.temp(...messages);
            return;
        }
        Logger.#tempEnd();
        console.warn(Logger.#createLogHeader(Logger.LogLevel.WARNING), ...messages);
    }

    // Log error messages
    static error(...messages)
    {
        if (Logger.minLogLevel > Logger.LogLevel.ERROR)
        {
            Logger.temp(...messages);
            return;
        }
        Logger.#tempEnd();
        console.error(Logger.#createLogHeader(Logger.LogLevel.ERROR), ...messages);
    }

    // Log with options
    static logOptions(logLevel, ...messages)
    {
        switch(logLevel)
        {
            case Logger.LogLevel.TEMP:
                Logger.temp(...messages);
                break;
            case Logger.LogLevel.DEBUG:
                Logger.debug(...messages);
                break;
            case Logger.LogLevel.LOG:
                Logger.log(...messages);
                break;
            case Logger.LogLevel.INFO:
                Logger.info(...messages);
                break;
            case Logger.LogLevel.WARNING:
                Logger.warn(...messages);
                break;
            case Logger.LogLevel.ERROR:
                Logger.error(...messages);
                break;
            default:
                break;
        }
    }

    // Group (indent next logs before groupEnd() is called)
    static group(...messages)
    {
        Logger.info(...messages);
        Logger.#groupsLevel++;
    }

    static groupEnd()
    {
        if (Logger.#groupsLevel > 0)
        {
            Logger.#groupsLevel--;
        }
    }

    static groupOptions(logLevel, ...messages)
    {
        Logger.logOptions(logLevel, ...messages);
        Logger.#groupsLevel++;
    }

    static #tempEnd()
    {
        if (Logger.#progressStarted)
        {
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            Logger.#progressStarted = false;
        }
    }

    static #createLogHeader(logLevel)
    {
        return `${(new Date()).toISOString()}|${Logger.#LogLevelStr[logLevel]}|${'  '.repeat(Logger.#groupsLevel)}`;
    }
}
