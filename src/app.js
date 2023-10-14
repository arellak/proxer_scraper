import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";

const baseUrl = "https://proxer.me";

const sleep = m => new Promise(r => setTimeout(r, m));

const readCookie = () => {
    const cookiePath = path.resolve("./data/cookie.txt");
    const cookie = fs.readFileSync(cookiePath, "utf8");
    return cookie.split("\n");
};

const saveHistory = (history) => {
    const historyPath = path.resolve("./output/history.json");
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 4));
};

const login = async(username, password) => {
    const url = `${baseUrl}/login`;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `username=${username}&password=${password}&remember=1`,
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    const error = $(".error").text();
    if (error){
        throw new Error(error);
    }

    const cookiesFull = response.headers.get("set-cookie");
    if (!cookiesFull){
        throw new Error("No cookies found");
    }

    const cookies = cookiesFull.split(";").map((cookie) => cookie.trim());
    const token = cookies[0].split("=");
    const joomlaToken = cookies[7].split(",")[1].split("=");

    return {
        token,
        joomlaToken,
    };
};

const getHistory = async(page, token, joomlaToken) => {
    const url = `${baseUrl}/ucp?s=history&p=${page}#top`;

    const cookie = `joomla_user_state=logged_in;style=gray;default_design=gray;tmode=ht;${joomlaToken[0]}=${joomlaToken[1]};proxer_loggedin=true;${token[0]}=${token[1]}`;

    const response = await fetch(url, {
        method: "GET",
        headers: {
            cookie,
            accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        },
    });

    const html = await response.text();
    const $ = cheerio.load(html);
    const table = $("table");
    const rows = $("tr", table);

    const history = [];

    rows.each((_, row) => {
        const cells = $("td", row);

        const anime = $(cells[0]).text();
        const episode = $(cells[1]).text();
        const language = $(cells[2]).text();
        const type = $(cells[3]).text();
        const date = $(cells[4]).text();
        if(anime === "" || episode === "" || language === "" || type === "" || date === "") return;

        history.push({
            anime,
            episode,
            language,
            type,
            date,
        });
    });

    return history;
};

const getFullHistory = async(token, joomlaToken) => {
    let page = 1;
    let history = [];
    let newHistory = await getHistory(page, token, joomlaToken);

    while (newHistory.length > 0){
        console.log("Waiting 2 seconds on page " + page);
        await sleep(2000);
        history = [...history, ...newHistory];
        page++;
        newHistory = await getHistory(page, token, joomlaToken);
    }

    return history;
};

const cookie = readCookie();
const token = cookie[0].split("=");
const joomlaToken = cookie[1].split("=");

const history = await getFullHistory(token, joomlaToken);
saveHistory(history);
