const username = 'lum-customer-hl_5ef8584a-zone-static';
const password = 'log3xdh80hz6';
const port = 22225;
const session = (1000000 * Math.random());

module.exports = {
    proxy: `http://servercountry-US.zproxy.lum-superproxy.io:${port};`,
    auth : {
        username,
        password
    }
}