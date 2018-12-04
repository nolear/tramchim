const request = require('request');
const h2p = require('html2plaintext')
const queryString = require('query-string');

window.onload = () => {


    document.querySelector('#btnStart').addEventListener('click', () => {
        
        let buttonElement = '#btnStart';
        let buttonDefaultText = $(buttonElement).text();

        $(buttonElement).html('<i class="fa fa-spinner fa-spin" style="font-size:20px"></i> Proccessing..');
        $(buttonElement).prop("disabled", true);

        let elementOutput = "#listOuput";
        let elementproccessingAll = "#proccessingAll";
        let elementproccessingCurrent = "#proccessingCurrent";


        let listInputMain = $("#listInputMain").val().trim().replace(/^\s*\n/gm, "").split('\n');
        let baseURL = $("#baseURL").val().trim();

        $(elementOutput).text('');
        $(elementproccessingCurrent).text(0);
        $(elementproccessingAll).text(listInputMain.length);

        let promisesRequestAll = []
        listInputMain.forEach(element => {
            let urlRequest = baseURL + encodeURIComponent(element);

            let requestData = request(urlRequest, function (error, response, body) {

                $(elementOutput).append(Object.values([
                    element,
                    h2p(body).replace(/(\r\n\t|\n|\r\t)/gm, ",")
                ]).join(' | ') + "\n");

                $(proccessingCurrent).text(Number($(elementproccessingCurrent).text()) + 1);
            });

            promisesRequestAll.push(requestData);

        });

        Promise.all(promisesRequestAll).then(result => {
            $(buttonElement).removeAttr('disabled');
            $(buttonElement).hide().text(buttonDefaultText).fadeIn();
        });

    })
};