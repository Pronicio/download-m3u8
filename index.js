const axios = require("axios");
const { mkdirSync, existsSync, rmSync, writeFileSync } = require("fs");
const term = require('terminal-kit').terminal;
const notifier = require('node-notifier');
const { exec } = require('child_process');
require('dotenv').config()

const m3u8Parser = require("m3u8-parser");
const parser = new m3u8Parser.Parser();

const name = process.env.NAME
const url = process.env.URL
const headers = {
    "Accept": "*/*",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "fr;q=0.8",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Origin": process.env.ORIGIN,
    "Pragma": "no-cache",
    "Referer": process.env.ORIGIN +"/",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36"
}

async function main() {
    let res = await get(url)

    parser.push(res.data);
    parser.end();

    let playlist = "";

    if (Boolean(process.env.BEST_QUALITY)) {
        let highestResolution = 0

        for (const timeline of parser.manifest.playlists) {
            if (!timeline.attributes) continue
            if (!timeline.attributes.RESOLUTION) continue

            if (timeline.attributes.RESOLUTION.width > highestResolution) {
                highestResolution = timeline.attributes.RESOLUTION.width;
                playlist = timeline;
            }
        }
    }

    const regexFindFileName = /([^\/.]+)$|([^\/]+)(\.[^\/.]+)$/g
    const testUrl = /^(http(s):\/\/.)[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/g
    let uri;

    if (!playlist.uri.match(testUrl)) {
        const find = url.search(regexFindFileName)
        uri = url.slice(0, find) + playlist.uri;
    } else {
        uri = playlist.uri
    }

    res = await get(uri.trim())

    parser.push(res.data);
    parser.end();

    if (existsSync(name)) {
        rmSync(name, { recursive: true });
        mkdirSync(name);
        mkdirSync(`${name}/segments`)
    } else {
        mkdirSync(name);
        mkdirSync(`${name}/segments`)
    }

    const totalSegments = parser.manifest.segments.length;
    let segmentsProcessed = 0

    const progressBar = term.progressBar({
        width: 80,
        title: 'Downloading...',
        eta: true,
        percent: true,
        items: totalSegments
    });

    for (const segment of parser.manifest.segments) {
        if (segment.attributes?.RESOLUTION?.width) continue

        const fileName = segment.uri.match(regexFindFileName)
        res = await get(segment.uri, fileName)

        segmentsProcessed++
        writeFileSync(`./${name}/segments/${segmentsProcessed}.ts`, res.data, { encoding: 'binary' });
        progressBar.update((segmentsProcessed * 100 / totalSegments) / 100);

        term.moveTo(0, 3); term.eraseLine(); term.bold("Segment : ")(`${segmentsProcessed}/${totalSegments}`);
    }

    await compile();
    progressBar.update(1);
    notifier.notify(`${name} Ready !`);
}

async function get(url, file) {
    return await axios({
        method: 'get',
        url: url,
        headers: headers,
        responseType: file ? "arraybuffer" : "json",
        onDownloadProgress: function ({ rate }) {
            if (file && rate) {
                const downloadSpeed = `${rate / 1000}Kb/s`
                term.moveTo(0, 2); term.eraseLine(); term.bold("Speed : ")(downloadSpeed);
            }
        },
        maxRate: [ 100 * 1024 * 1000 ],
    }).catch(e => {
        console.error(e)
    })
}

async function compile() {
    await exec(`copy /b *.ts all.ts`, { cwd: `${name}/segments` }, async (err, stdout, stderr) => {
        if (err) {
            console.error(`exec error: ${err}`);
            return;
        }

        await exec(`ffmpeg -i all.ts -c copy ../${name}.mp4`, { cwd: `${name}/segments` }, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
            }
        });
    });
}

main().then()
