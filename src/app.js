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

const getGenre = async(link) => {
    const url = `${baseUrl}${link}`;
    const response = await fetch(url, {
        method: "GET",
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    const genre = [];
    $(".genreTag").each((_, element) => {
        genre.push($(element).text());
    });
    return genre;
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

    for(const row of rows){
        const cells = $("td", row);

        const anime = $(cells[0]).text();
        const link = $("a", cells[0]).attr("href");
        const date = $(cells[4]).text();
        if(anime === "") continue;

        if(history.some((e) => e.anime === anime)) continue;
        console.log("Waiting 3 seconds before getting genre...");
        await sleep(3000);
        const genre = await getGenre(link);

        history.push({anime, date, genre});
    }

    return history;
};

const getFullHistory = async(token, joomlaToken) => {
    let page = 1;
    let history = [];
    let newHistory = await getHistory(page, token, joomlaToken);

    while (newHistory.length > 0){
        console.log("Waiting 1 second on page " + page);
        await sleep(1000);
        history = [...history, ...newHistory];
        page++;
        newHistory = await getHistory(page, token, joomlaToken);
    }

    history = history.filter((historyItem, index, self) =>
        index === self.findIndex((t) => {
            return (t.anime === historyItem.anime);
        }),
    );

    return history;
};

const cookie = readCookie();
const token = cookie[0].split("=");
const joomlaToken = cookie[1].split("=");

const history = await getFullHistory(token, joomlaToken);
saveHistory(history);
