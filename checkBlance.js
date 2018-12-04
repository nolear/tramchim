const puppeteer = require('puppeteer');
const fs = require('fs');
const checkBlancerHelper = require('../helper/bloom/checkBlance');
const utilsHelper = require('../helper/utils');
const Datastore = require('nedb')
const blanceDB = new Datastore({
    filename: 'database/blance.db',
    autoload: true
});


const autoSave = () => {
    blanceDB.find({}, {
        "_id": 0
    }, (err, doc) => {
        let output = '';
        doc.forEach(element => {
            if (element.loyaltyNumber)
                output += Object.values(element).join('|') + "\n";
        });


        let stream = fs.createWriteStream("checkBlance.txt");

        stream.once('open', function (fd) {
            stream.write(output);
            stream.end();
        });
    });
}
autoSave()
setInterval(autoSave, 10000);


window.onload = () => {

    blanceDB.find({}, {
        "_id": 0
    }, (err, doc) => {
        let listOuputRestore = '#listOuputRestore';
        doc.forEach(element => {
            $(listOuputRestore).append(Object.values(element).join('|') + "\n");
        });
    });

    document.querySelector('#btnStart').addEventListener('click', async () => {

        let cookiesJson = $("#listInputCookie").val();
        if (!utilsHelper.IsJsonString(cookiesJson)) {
            alert("Cookie not Json");
            return false;
        }

        let showBrowser = $('#checkboxShowBrowser').is(":checked");
        if (showBrowser) showBrowser = false
        else showBrowser = true

        let buttonElement = '#btnStart';
        let buttonDefaultText = $(buttonElement).text();

        $(buttonElement).html('<i class="fa fa-spinner fa-spin" style="font-size:20px"></i> Proccessing..');
        $(buttonElement).prop("disabled", true);

        let elementOutput = "#listOuput";
        let elementproccessingAll = "#proccessingAll";
        let elementproccessingCurrent = "#proccessingCurrent";


        let cookies = JSON.parse($("#listInputCookie").val());
        let listInput = $("#listInputMain").val().trim().replace(/^\s*\n/gm, "").split('\n');

        $(elementOutput).text('');
        $(elementproccessingCurrent).text(0);
        $(elementproccessingAll).text(listInput.length);

        let cookieCreate = await checkBlancerHelper.createNewAccount(showBrowser);
        let renewCookies = false;

        let browser = await puppeteer.launch({
            headless: showBrowser,
            executablePath: utilsHelper.getChromiumExecPath(),
        });
        let page = (await browser.pages())[0];


        await page.setCookie(...cookieCreate);

        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36");
        await page.setViewport({
            width: 1366,
            height: 768
        });

        await utilsHelper.asyncForEach(listInput, async (element) => {

            let extract = element.split("|");
            let loyaltInput = {
                loyaltyNumber: extract[0],
                lastName: extract[1],
                zipCode: extract[2],
            }

            let blanceSaved = await new Promise((resolve, reject) => {
                blanceDB.find({
                    loyaltyNumber: loyaltInput.loyaltyNumber
                }, {
                    "_id": 0
                }, (err, doc) => {
                    resolve(doc)
                });
            });
            if (!blanceSaved[0]) {

                let result = {
                    ...loyaltInput,
                    blance: "Card Die",
                }

                try {
                    await page.goto("https://www.bloomingdales.com/loyallist/accountassociation?from=remove").catch(() => {});


                    if (await page.$(".lty-as-remove-link") !== null) {
                        await page.click(".lty-as-remove-link");
                        await page.waitFor(1000);
                        await page.click("#submit");
                        await page.waitFor(5000);
                        await page.goto("https://www.bloomingdales.com/loyallist/accountassociation?from=remove").catch(() => {});
                        await page.waitFor(5000);
                    }

                    while (renewCookies || await page.$("#loyaltyAccountInfo\\2e loyaltyNumber") == null) {
                        let cookieCreate = await checkBlancerHelper.createNewAccount(showBrowser);
                        await page.setCookie(...cookieCreate);
                        await page.goto("https://www.bloomingdales.com/loyallist/accountassociation?from=remove").catch(() => {});

                        if (await page.$(".lty-as-remove-link") !== null) {
                            await page.click(".lty-as-remove-link");
                            await page.waitFor(1000);
                            await page.click("#submit");
                            await page.waitFor(5000);
                            await page.goto("https://www.bloomingdales.com/loyallist/accountassociation?from=remove").catch(() => {});
                            await page.waitFor(5000);
                        }
                        renewCookies = false;
                    }

                    if (await page.$("#loyaltyAccountInfo\\2e loyaltyNumber") !== null) {
                        await page.evaluate((loyaltInput) => {
                            document.querySelector("#loyaltyAccountInfo\\2e loyaltyNumber").value = loyaltInput.loyaltyNumber
                            document.querySelector("#loyaltyAccountInfo\\2e lastName").value = loyaltInput.lastName
                            document.querySelector("#loyaltyAccountInfo\\2e zipCode").value = loyaltInput.zipCode
                            document.querySelector("#loyaltyEnrollBtn").click()
                        }, loyaltInput);
                        await page.waitFor(5000);

                        if (await page.$("#loyaltyEnrollBtn") !== null) {
                            await page.evaluate( () => {
                                document.querySelector("#loyaltyEnrollBtn").click()
                            });
                            await page.click("#loyaltyEnrollBtn");
                            await page.waitFor(5000);
                        }
                    }
                    if (await page.$("#loyaltyEnrollBtn") == null) {
                        let cookiesRender = await page.cookies();
                        result = await checkBlancerHelper.checkBlance(cookiesRender, loyaltInput);
                    } else {
                        renewCookies = true;
                    }

                } catch (err) {
                    console.log(err);
                } finally {
                    console.log(result)
                    if (Object.values(result).length) {
                        $(elementOutput).append(Object.values(result).join('|') + "\n");
                        blanceDB.insert(result)
                    }
                }
            } else {
                $(elementOutput).append(Object.values(blanceSaved[0]).join('|') + "\n");
            }

            $(proccessingCurrent).text(Number($(elementproccessingCurrent).text()) + 1);
        });

        await page.close();

        $(buttonElement).removeAttr('disabled');
        $(buttonElement).hide().text(buttonDefaultText).fadeIn();

    })
};