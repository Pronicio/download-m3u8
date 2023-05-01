const axios = require("axios");
const { mkdirSync, existsSync, rmSync, writeFileSync } = require("fs");
const term = require('terminal-kit').terminal;
const notifier = require('node-notifier');

const m3u8Parser = require("m3u8-parser");
const parser = new m3u8Parser.Parser();

const name = "Blue-Lock-20"
const url = "https://uo-od2-5dp-cd.vmrange.lat/hls/xqx2oxhjozokjiqbte7cj6yfxmtfahmof7vlaczab,q462qsfdayscofjri3q,zo62qsfday4sul4hqwa,.urlset/master.m3u8"
const headers = {
    "Accept": "*/*",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "fr;q=0.8",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Origin": "https://vidmoly.to",
    "Pragma": "no-cache",
    "Referer": "https://vidmoly.to/",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36"
}
const params = {
    bestQuality: true
}

async function main() {
    let res = await get(url)

    parser.push(res.data);
    parser.end();

    let playlist = ""

    if (params.bestQuality) {
        let highestResolution = 0

        for (const timeline of parser.manifest.playlists) {
            if (timeline.attributes.RESOLUTION.width > highestResolution) {
                highestResolution = timeline.attributes.RESOLUTION.width;
                playlist = timeline;
            }
        }
    }

    res = await get(playlist.uri)

    parser.push(res.data);
    parser.end();

    const folderName = `${name}`

    if (existsSync(folderName)) {
        rmSync(folderName);
        mkdirSync(folderName);
    } else {
        mkdirSync(folderName);
    }

    const progressBar = term.progressBar({
        width: 80,
        title: 'Downloading...',
        eta: true,
        percent: true
    });

    const regexFindFileName = /([^\/.]+)$|([^\/]+)(\.[^\/.]+)$/g
    const totalSegments = parser.manifest.segments.length;
    let segmentsProcessed = 0

    for (const segment of parser.manifest.segments) {
        if (segment.attributes?.RESOLUTION?.width) continue

        const fileName = segment.uri.match(regexFindFileName)
        res = await get(segment.uri, fileName)

        segmentsProcessed++
        writeFileSync(`./${name}/${segmentsProcessed}.ts`, res.data, { encoding: 'binary' });
        progressBar.update((segmentsProcessed * 100 / totalSegments) / 100);
    }

    progressBar.stop();
    notifier.notify(`${name} Ready !`);
}

async function get(url, file) {
    return await axios({
        method: 'get',
        url: url,
        headers: headers,
        responseType: file ? "arraybuffer" : "json",
        maxRate: [ 100 * 1024 * 1000 ],
    }).catch(e => {
        console.error(e)
    })
}

main().then()
