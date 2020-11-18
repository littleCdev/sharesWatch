const Config = require('./config.json');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 4000;

const Sqlite3   = require('sqlite3').verbose();
const util      = require('util');
const Fs        = require('fs');
const fetch     = require("node-fetch");

const comdirect = require('./comdirect-parser');

let db = null;
let bot = null;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/static',express.static('public'));


async function main(){
    try {
        db = await new Sqlite3.Database('./watch.sqlite', Sqlite3.OPEN_READWRITE | Sqlite3.OPEN_CREATE);
    } catch (e) {
        Log("main","failed to connect to sqlite: " + e,true);
        return;
    }
    Log("main","sqlite connected",true);

    db.run = util.promisify(db.run);
    db.get = util.promisify(db.get);
    db.all = util.promisify(db.all);

    let schema = Fs.readFileSync("watch.sql") + "";
    //remove \n
    schema = schema.replace(/(\r\n|\n|\r)/gm, "");

    let tableSchemas = schema.split(";");
    try {
        for (let i = 0; i < tableSchemas.length; i++) {
            if (tableSchemas[i].length === 0)
                continue;
            Log("main","sqlite: running: " + tableSchemas[i],true);
            await db.run(tableSchemas[i]);
            Log("main","sqlite done",true);
        }
    } catch (e) {
        Log("main","sqlite: failed to create db: " + e,true);
        return;
    }
    Log("main","db done");
    app.listen(Config.WebPort, () => {
        Log("main",`Example app listening at http://localhost:${Config.WebPort}`);
    });


    if(Config.BotToken.length > 0){
        bot = new TelegramBot(Config.BotToken, {polling: true});
        Log("main","bot: polling");
        bot.on("message", async msg => {
            handleTelegramMessage(msg, msg.text);
        });
    }else {
        Log("main","Looks like you didn't add an Bottoken for telegram");
        Log("main","Open telegram and messsage @botfather and add your bottoken to config.json");
        Log("main","then restart the application");
    }
	clearLog();
    setInterval(checkShares,60000*5); // check shares every 5 minutes
    setInterval(clearLog,60000*60); // clear logs every hour
}

function Log(func,msg,noDb=false){
    let date = new Date().toISOString();
    console.log(`${date}\t${func}\t${msg}`);

    let utime = new Date()/1000;

    if(!noDb){
        db.run("INSERT INTO log (utime,time,function,message) VALUES (?,?,?,?)",[utime,date,func,msg]);
    }
}

function clearLog(){
    Log("clearLog","clearing log");
    let utime = new Date()/1000;
    db.run("DELETE FROM log where utime<?",[utime-60*60*24*7]) // 60*60*24*7 => one week of logs
}

async function checkShares(){
    Log("checkShares",`checkShares`);
    let shares = [];
    try{
        shares = await db.all("SELECT * FROM shares");
    }catch (e) {
        Log("checkShares",`error: ${msg}`);
        broadcastTgMessage(msg);
        return;
    }
    for(let i=0;i<shares.length;i++){
        let share = shares[i];
        let coolddowntime = 60*60; // 60seconds*60Minutes = 1 hour
        if(share.cooldown > (new Date()/1000) - coolddowntime){
            Log("checkShares",`Skipping ${share.ID} - ${share.name} because of cooldown`);
            continue;
        }
        try{
            const response = await fetch(share.url);
            const text = await response.text();

            let currentPrice = await comdirect.getPrice(text);
            currentPrice = parseFloat(currentPrice.replace(",","."));
            Log("checkShares",`currentPrice: ${currentPrice}`);
            let name = await comdirect.getName(text);

            await db.run("UPDATE shares SET lastprice=? where ID=?",[currentPrice,share.ID]);
            let limit = parseFloat((share.alarmlimit+"").replace(",","."));
            Log("checkShares",`checking ${share.ID} - ${share.name}  current: ${currentPrice} against (${share.alarm})  ${share.alarmlimit}`);
            switch (share.alarm) {
                case "gt":
                    if(currentPrice > limit){
                        await db.run("UPDATE shares SET cooldown=? where ID=?",[(new Date()/1000),share.ID]);
                        broadcastTgMessage(`${name} hit the limit!\n ${currentPrice} (current) > ${limit} (your limit)`);
                    }
                    break;
                case "lt":
                    if(currentPrice < limit){
                        await db.run("UPDATE shares SET cooldown=? where ID=?",[(new Date()/1000),share.ID]);
                        broadcastTgMessage(`${name} hit the limit!\n${currentPrice} (current) < ${limit} (your limit)`);
                    }
                    break;
            }

        }catch (e) {
            broadcastTgMessage("error:" +e+"");
            Log("checkShares",`error: ${e}`);
        }
    }
}


async  function broadcastTgMessage(msg){
    let users = await db.all("SELECT * FROM tgusers");
    Log("broadcastTgMessage",`broadcasting: ${msg}`);
    for(let i=0;i<users.length;i++){
        Log("broadcastTgMessage",`user: ${users[i].tgId} - ${users[i].username}`);
        bot.sendMessage(users[i].tgId,msg);
    }
}
async function handleTelegramMessage(msg, text) {
    let check = await checkTgUser(msg);
    Log("handleTelegramMessage",`new message from ${msg.chat.id} ${msg.chat.first_name}: ${msg.chat.text}`);
    if(!check){
        bot.sendMessage(msg.chat.id,"Please wait for an administrator to approve your account");
        return;
    }
}
async function checkTgUser(msg){
    await db.run("INSERT INTO tgusers (TGID, USERNAME, ACCEPTED) VALUES (?,?,0)",[msg.chat.id,msg.chat.first_name]);

    let users = await db.all("SELECT * FROM tgusers where tgId=?",[msg.chat.id]);
    let user = users[0];

    return user.accepted;
}

async function setTgUser(id,enable){
    enable = enable+"";
    if(enable!=="0" && enable!=="1")
        throw new Error("invalid enable, only 1 and 0");

    await db.run("UPDATE tgusers SET accepted=? WHERE tgId=?",[enable,id]);

    Log("setTgUser",`updating accecpt for ${id} to ${enable}`);

    if(enable == "1")
        bot.sendMessage(id,"you got approved");
    else
        bot.sendMessage(id,"you got disabled");
}

async function addShare(url){
    const response = await fetch(url);
    const text = await response.text();

    let currentPrice = await comdirect.getPrice(text);
    let name = await comdirect.getName(text);
    Log("addShare",`adding share with name ${name} price: ${currentPrice}`);

    await db.run("INSERT INTO shares (name,lastprice,url) VALUES (?,?,?)",[name,currentPrice,url]);
}
async function deleteShare(id){
    Log("deleteShare",`deleting ${id}`);
    await db.run("DELETE FROM shares WHERE ID=?",[id]);
}
async function updateShare(id,alarm,alarmlimit){
    if(alarm !== "lt" && alarm !== "gt")
        throw  new  Error ("only gt and lt allowed");

    Log("updateShare",`updating ${id}: alarm=${alarm},limit=${alarmlimit}`);
    await db.run("UPDATE shares SET alarm=?,alarmlimit=?,cooldown=0 where ID=?",alarm,alarmlimit,id);
}


app.get('/telegram/info', async function (req, res) {
    if(Config.BotToken.length == 0){
        res.send({"error":true,"message":"please add your bottoken to config.json"})
        return;
    }
    let result = await bot.getMe();
    res.send(result);
});
app.get('/telegram/all', async function (req, res) {
    let result = await db.all("SELECT * FROM tgusers");
    res.send(result);
});
app.post('/telegram/user', async function (req, res) {
    let id = req.body.id;
    let enable = req.body.enable;

    try{
        await setTgUser(id,enable);
    }catch (e) {
        Log("error",`error: ${e}`);
        res.send({"error":true,"message":e+""});
        return;
    }

    res.send({"error":false})
});

app.post('/api/delete', async function (req, res) {
    let id = req.body.id;
    try{
        await deleteShare(id);
    }catch (e) {
        Log("error",`error: ${e}`);
        res.send({"error":true,"message":e+""});
        return;
    }
    res.send({"error":false})
});
app.post('/api/new', async function (req, res) {
    let url = req.body.url;
    try{
        await addShare(req.body.url);
    }catch (e) {
        Log("error",`error: ${e}`);
        res.send({"error":true,"message":e+""});
        return;
    }
    res.send({"error":false})
});
app.post('/api/alarm', async function (req, res) {
    let id = req.body.id;
    let type = req.body.type;
    let limit = req.body.limit;
    try{
        await updateShare(id,type,limit);
    }catch (e) {
        Log("error",`error: ${e}`);
        res.send({"error":true,"message":e+""});
        return;
    }
    res.send({"error":false})
});
app.get('/api/all', async function (req, res) {
    let result = await db.all("SELECT * FROM shares");
    res.send(result);
});

app.get('/log/all', async function (req, res) {
    let result = await db.all("SELECT * FROM log order by utime desc");
    res.send(result);
});

app.get('/*.html', function (req, res) {
    res.sendFile(`public${req.url}`, {root: __dirname});

});
app.get('/', async function (req, res) {
    res.sendFile('public/index.html', {root: __dirname});
});

main();