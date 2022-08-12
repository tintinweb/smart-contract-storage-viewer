function isAllASCII(arr) {
    return !!arr.filter(e => e >= 32 && e <= 126).length
}

function toHexString(byteArray) {
    return Array.from(byteArray, function (byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('')
}

var byteArrayToInt = function (byteArray) {
    var value = 0;
    byteArray = byteArray.reverse()
    for (var i = byteArray.length - 1; i >= 0; i--) {
        value = (value * 256) + byteArray[i];
    }

    return BigInt(value);
};

function* chop(arr, chunkSize) {
    for (let i = 0; i < arr.length; i += chunkSize) {
        yield arr.slice(i, i + chunkSize);
    }
}

function getMinimalSlotDataLength(arr) {
    return arr.reduce((result, current) => {
        if (result.length) {
            result.push(current);
        } else if (current != 0) {
            result.push(current)
        }
        return result;
    }, [])
}


function analyzeSlot(arr) {
    let minimal = getMinimalSlotDataLength(arr);
    let startSeqence = arr.slice(0, arr.indexOf(0));
    let slot = {
        guess: {},
        raw: {
            data: arr
        },
    }

    if (minimal.length == 0) {
        slot.guess['uint256'] = 0;
        slot.guess['bool'] = false;
        slot.guess['empty'] = undefined;
    } else if (minimal.length != 0
        && arr[arr.length - 1] != 0
        && arr[arr.length - 1] % 2 == 0
        & startSeqence.length == arr[arr.length - 1] / 2) {
        // short string that fits into one slot
        let len = Math.floor(arr[arr.length - 1] / 2)
        if (isAllASCII(startSeqence)) {
            slot.guess[`string_short_${len}`] = new TextDecoder("utf-8").decode(new Uint8Array(startSeqence))
        } else {
            slot.guess[`bytes_short_${len}`] = new TextDecoder("utf-8").decode(new Uint8Array(startSeqence))
        }

    } else if (minimal.length == 1 && arr[arr.length - 1] == 1) {
        // likely bool true or int 1
        slot.guess['bool'] = true;
        slot.guess['uint8'] = 1;
    } else if ([1, 2, 4, 8, 16, 32].includes(minimal.length)) {
        // perfect data width match
        slot.guess[`uint${minimal.length * 8}`] = byteArrayToInt(minimal).toString()
    } else if (minimal.length <= 20 && minimal.length > 16) {
        // addrss with leading zeros?
        slot.guess['address'] = `0x${toHexString(minimal).padStart(20, '0')}`
        slot.guess['uint160'] = byteArrayToInt(minimal).toString()
    } else if (minimal.length) {
        // maybe an imperfect uint match? fit into next int
        let fitWidth = (minimal.length + 7) & (-8)
        slot.guess[`uint${fitWidth}`] = byteArrayToInt(minimal).toString()
    } else {
        // 🤷‍♂️
        slot.guess['🤷‍♂️'] = undefined;
    }
    return slot;
}

export default function analyzeStorage(state) {
    let startSlot = parseInt(state.startslot.replace("0x", ""), 16)
    let i = 0;
    let ret = {};
    for (let slotBytes of chop(state.data, 32)) {
        let currSlot = `slot: 0x${(startSlot+i).toString(16)} (0x${(startSlot + i * 32).toString(16)})`;
        ret[currSlot] = analyzeSlot(slotBytes);
        i++;
    }
    return ret;
}
