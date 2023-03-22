const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const chalk = require('chalk');
const fs = require('fs');
const https = require('https');

class Utils {
    static formatConsoleDate( date ) {
        var hour = date.getHours();
        var minutes = date.getMinutes();
        var seconds = date.getSeconds();
        var milliseconds = date.getMilliseconds();

        return '[' +
            ((hour < 10) ? '0' + hour : hour) +
            ':' +
            ((minutes < 10) ? '0' + minutes : minutes) +
            ':' +
            ((seconds < 10) ? '0' + seconds : seconds) +
            '.' +
            ('00' + milliseconds).slice(-3) +
        '] ';
    }

    static genString( length ) {
        var result = '';
        var characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for ( var i = 0; i < length; i++ ) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    static Logs = class {
        static Info( message ) {
            console.log(chalk.hex('#d6af42')(Utils.formatConsoleDate(new Date())) + chalk.cyan('[INFO] ') + message);
        }

        static Error( message ) {
            console.log(chalk.hex('#d6af42')(Utils.formatConsoleDate(new Date())) + chalk.red('[ERROR] ') + message);
        }

        static Success( message ) {
            console.log(chalk.hex('#d6af42')(Utils.formatConsoleDate(new Date())) + chalk.green('[SUCCESS] ') + message);
        }

        static Warning( message ) {
            console.log(chalk.hex('#d6af42')(Utils.formatConsoleDate(new Date())) + chalk.yellow('[WARNING] ') + message);
        }
    }
}

class Hcaptcha {
    static async downloadImage( url, folderName, prompt ) {
        fs.mkdirSync('images/' + folderName, { recursive: true });
        const filename = 'images/' + folderName +  '/' + Utils.genString(10) + '.jpeg'
        const file = fs.createWriteStream(filename);

        fs.writeFileSync('images/' + folderName +  '/prompt.txt', prompt);

        return new Promise((resolve, reject) => {
            https.get(url, (response) => {
                response.pipe(file);
                file.on('finish', () => {
                  file.close(resolve);
                });
            }).on('error', (error) => {
                fs.unlink(filename);
                reject(error);
            });
        });
    }

    static async collectImages( page ) {
        await page.waitForSelector('body > div:nth-child(9) > div:nth-child(1) > iframe')
        const iframeElement = await page.$('body > div:nth-child(9) > div:nth-child(1) > iframe')
        const iframe = await iframeElement.contentFrame()

        await iframe.waitForSelector('div.challenge-container > div > div > div.task-grid')
        const taskGrid = await iframe.$('div.challenge-container > div > div > div.task-grid')
        const childrens = await taskGrid.$$('div .task-image')

        const prompt = await iframe.$('div.challenge-container > div > div > div.challenge-header > div.challenge-prompt > div.prompt-padding > h2 > span')
        const promptText = await prompt.evaluate(node => node.innerText);
        
        const folderName = Utils.genString(20)

        Utils.Logs.Info('Prompt: ' + promptText)

        await page.waitForTimeout(2000)
        
        childrens.map( async (child) => {
            await child.waitForSelector('div.image-wrapper > div')

            const image = await child.$('.image-wrapper > div')
            const imageSrc = await image.evaluate(node => node.style.backgroundImage.replace('url("', '').replace('")', ''));
            Hcaptcha.downloadImage( imageSrc, folderName, promptText )
        })
    }

    static open( page ) {
        return new Promise(async (resolve, reject) => {
            await page.waitForSelector('#hcaptcha-demo > iframe')
            const iframeElement = await page.$('#hcaptcha-demo > iframe')
            const iframe = await iframeElement.contentFrame()
    
            await iframe.waitForSelector('#checkbox')
            await iframe.click('#checkbox')
            resolve()
        });
    }

    static async reload( page ) {
        const iframeElement = await page.$('body > div:nth-child(9) > div:nth-child(1) > iframe')
        const iframe = await iframeElement.contentFrame()

        await iframe.waitForSelector('body > div.challenge-interface > div.button-submit.button')
        await iframe.click('body > div.challenge-interface > div.button-submit.button')
    }
}

async function main() {
    const number = process.argv[2]
    if ( process.argv.length < 3 ) {
        Utils.Logs.Error('Please specify the number of images to collect (e.g. node main.js 100)')
        return
    }

    const options = { 
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-logging',
            '--disable-infobars',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-web-security',
            '--disable-webrtc-multiple-routes',
            '--disable-webrtc-pacing'
        ],

        ignoreHTTPSErrors: true
    }

    puppeteer.use(StealthPlugin())

    const browser = await puppeteer.launch( options );
    const incognitoContext = await browser.createIncognitoBrowserContext();
    const page = await incognitoContext.newPage();

    const pages = await browser.pages();
    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        if (page.browserContext() !== incognitoContext) {
            await page.close();
        }
    }

    await page.goto('https://accounts.hcaptcha.com/demo');
    await Hcaptcha.open( page ).then( async () => {
        for (let i = 0; i < number; i++) {
            await Hcaptcha.collectImages( page )
            await Hcaptcha.reload( page )
        }
    });
}

if (require.main === module) {
    (async () => {
        await main();
    })();
}