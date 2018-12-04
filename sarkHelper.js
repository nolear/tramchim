var requestSync = require('request-promise-native');
var cheerio = require('cheerio');

var helperSark = {
    IsJsonString: function (str) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    },
    cookiesParseString: function (cookies = []) {
        let cookieStr = "";
        cookies.forEach(function (eachCookie) {
            cookieStr += `${eachCookie.name}=${eachCookie.value};`
        });
        return cookieStr;
    },
    buildRequest: function (cookies = [], userAgent = false) {
        let cookieJar = requestSync.jar();
        let strCookies = this.cookiesParseString(cookies);

        let headers = {
            'Content-Type': 'application/json',
            'User-Agent': userAgent || 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_2_1 like Mac OS X) AppleWebKit/602.4.6 (KHTML, like Gecko) Version/10.0 Mobile/14D27 Safari/602.1',
            'cookie': strCookies,
        };
        let requestBuilder = requestSync.defaults({
            jar: cookieJar,
            headers: headers,
            transform: (body, response) => {
                if (this.IsJsonString(body))
                    return JSON.parse(body)
                else
                    return body;
            }
        })
        return requestBuilder;
    },
    checkLogin: async function (dataLogin, cookies, loginResult, userAgent) {

        console.log(loginResult)

        let result = {
            success: -1,
            status: 'ERROR',
            ...dataLogin,
            point: 'none',
            cardNumber: 'none',
            resLogin: 'none',
        }
        try {
            let requestSark = this.buildRequest(cookies, userAgent);

            /*
            let loginResult = await new Promise((resolve, reject) => {
                requestSark.post({
                    uri: "https://m.saks.com/v1/account-service/accounts/sign-in",
                    body: JSON.stringify(dataLogin)
                }).then (response=> {
                    resolve(response)
                }).catch (response=> {
                    resolve(response.response)
                })
            });
            */

            result.resLogin = loginResult;

            if (loginResult.response && loginResult.response.results && loginResult.response.results.id) {
                let userID = loginResult.response.results.id;
                let point = 0;
                let cardNumber = [];

                let summaryData = await requestSark.get(`https://m.saks.com/v1/account-service/accounts/${userID}/summary`)
                point = summaryData.response.results.rewards.member_info.available_points;

                let paymentData = await requestSark.get(`https://m.saks.com/v1/account-service/accounts/${userID}/payment-methods`)

                paymentData.response.results.payment_methods_info.forEach(element => {
                    cardNumber.push(element.display_brand_name);
                });

                result.status = 'LIVE';
                result.success = 1;
                result.point = point;
                result.cardNumber = cardNumber;
            } else if (loginResult.errors && loginResult.errors[0]) {
                result.status = 'DIE';
                result.success = 0;
            }

        } catch (msg) {
            console.log(msg)
        } finally {
            return result;
        }

    }
}

module.exports = helperSark;