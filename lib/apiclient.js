import $ from 'jquery';

export default class EthRPC {

    constructor(endpoint, etherscanApiKey) {
        this.id = 0;
        this.endpoint = endpoint;
        this.etherscanApiKey = etherscanApiKey && etherscanApiKey.length ? etherscanApiKey : "YourApiKeyToken";
    }

    setEndpoint(endpoint) {
        this.endpoint = endpoint;
    }

    call(method, params) {
        const that = this;
        return new Promise(function (resolve, reject) {

            $.ajax({
                url: that.endpoint,
                data: JSON.stringify({ jsonrpc: '2.0', method: method, params: params, id: that.id++ }),
                type: "POST",
                dataType: "json",
                success: function (data) { resolve(data); },
                error: function (err) { reject(err) }
            });
        });
    }

    callBatch(method, paramsBatch) {
        const that = this;
        if (that.endpoint.substr("infura.io")) {
            // supports batch mode
            return new Promise(function (resolve, reject) {
                $.ajax({
                    url: that.endpoint,
                    data: JSON.stringify(paramsBatch.map(p => { return { jsonrpc: '2.0', method: method, params: p, id: that.id++ } })),
                    type: "POST",
                    dataType: "json",
                    success: function (data) { resolve(data); },
                    error: function (err) { reject(err) }
                });
            });
        } else {
            // fallback 
            return Promise.all(paramsBatch.map(p => this.call(method, p)));
        }
    }

    getStorageAt(target, start, num, atBlock) {
        start = parseInt(start.replace("0x", ""), 16)

        atBlock = atBlock || "latest";
        start = start || 0;
        num = num || 1;
        let params = [...Array(num).keys()].map((idx) => [target, (start + idx).toString(16), atBlock])
        return this.callBatch("eth_getStorageAt", params);
    }

    etherscanTxList(address, network, action) {
        const that = this;
        return new Promise(function (resolve, reject) {
            let url = `https://api${network && network.length && network != "mainnet"? '-'+network : ""}.etherscan.io/api?module=account&action=${action || "txlist"}&address=${address}&startblock=0&endblock=99999999&page=0&offset=0&sort=desc&apikey=${that.etherscanApiKey}`;
            console.log(url)
            $.ajax({
                url: url,
                type: "GET",
                dataType: "json",
                success: function (data) {
                    if (data && data.error) {
                        return reject(data);
                    }
                    return resolve(data);
                },
                error: function (err) { return reject(err) }
            });
        });
        //
    }

}