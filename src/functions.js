
const fileSizeSuffix = [ `B`, `KiB`, `MiB`, `GiB`, `TiB` ];
function getFileSizeReadable(fileSizeBytes)
{
    let i = 0;
    while (fileSizeBytes >= 1024 && i < 4)
    {
        fileSizeBytes /= 1024;
        i++;
    }
    return `${fileSizeBytes.toFixed(3)} ${fileSizeSuffix[i]}`;
}

const oneSecond = 1000;
const oneMin = oneSecond * 60;
const oneHour = oneMin * 60;
const oneDay = oneHour * 24;
const oneMonth = oneDay * 30.4;
const oneYear = oneMonth * 365.25;
const timeConvert = [ oneYear, oneMonth, oneDay, oneHour, oneMin, oneSecond, 1 ];
const timeSuffix = [ `y`, `mon`, `d`, `h`, `min`, `s`, `ms` ];
function getTimeReadable(timeMs)
{
    let str = '';
    let hasValue = false;
    let i = 0;
    while (i < 7)
    {
        const convertValue = timeConvert[i];
        if (timeMs >= convertValue)
        {
            const value = Math.floor(timeMs / convertValue);
            str += `${hasValue ? ' ' : ''}${value}${timeSuffix[i]}`;
            timeMs -= (value * convertValue);
            hasValue = true;
        }
        i++;
    }
    return str;
}

export { getFileSizeReadable, getTimeReadable };
