var puppeteer = require('puppeteer');

var util = {
    IsJsonString: function (str) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    },
    sleep: function (ms){
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    asyncForEach: async function (array, callback){
        for (let index = 0; index < array.length; index++) {
            await callback(array[index], index, array)
        }
    },
    getChromiumExecPath: function() {
        return puppeteer.executablePath().replace('app.asar', 'app.asar.unpacked');
    }
}
module.exports = util