import $ from 'jquery';

export default class EthRPC {

    constructor(endpoint) {
        this.id = 0;
        this.endpoint = endpoint;
    }

    setEndpoint(endpoint) {
        this.endpoint = endpoint;
    }

    call(method, params) {
        const that = this;
        return new Promise(function (resolve, reject) {

            $.ajax({
                url: that.endpoint,

                data: JSON.stringify({ jsonrpc: '2.0', method: method, params: params, id: that.id++ }),  // id is needed !!

                type: "POST",

                dataType: "json",
                success: function (data) { resolve(data.result); },
                error: function (err) { reject(err) }
            });
        });
    }

    callBatch(method, paramsBatch) {
        return Promise.all(paramsBatch.map(p => this.call(method, p)));
    }

    getStorageAt(target, start, num, atBlock) {
        start = parseInt(start.replace("0x", ""), 16)

        atBlock = atBlock || "latest";
        start = start || 0;
        num = num || 1;
        let params = [...Array(num).keys()].map((idx) => [target, (start + idx).toString(16), atBlock])
        return this.callBatch("eth_getStorageAt", params);
    }

}
