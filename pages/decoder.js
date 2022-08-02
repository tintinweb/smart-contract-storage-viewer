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
    for (var i = byteArray.length - 1; i >= 0; i--) {
        value = (value * 256) + byteArray[i];
    }

    return value;
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


function analyzeSlot(arr, idx) {
    let minimal = getMinimalSlotDataLength(arr);
    let startSeqence = arr.slice(0, arr.indexOf(0));
    let slot = {
        idx: idx,
        type: [],
        full: arr,
        decoded: []
    }

    if (minimal.length == 0) {
        slot.type = ['uint256', 'bool_false', 'unknown']
        slot.decoded = [0, false, minimal]
    } else if (minimal.length != 0
        && arr[arr.length - 1] != 0
        && arr[arr.length - 1] % 2 == 0
        & startSeqence.length == arr[arr.length - 1] / 2) {
        // short string that fits into one slot
        let len = Math.floor(arr[arr.length - 1] / 2)
        if (isAllASCII(startSeqence)) {
            slot.type = [`string_short_${len}`]
            slot.decoded = [new TextDecoder("utf-8").decode(new Uint8Array(startSeqence))]
        } else {
            slot.type = [`bytes_short_${len}`]
            slot.decoded = [new TextDecoder("utf-8").decode(new Uint8Array(startSeqence))]
        }

    } else if (minimal.length == 1 && arr[arr.length - 1] == 1) {
        // likely bool true or int 1
        slot.type = ['bool_true', 'uint8']
        slot.decoded = [true, 1]
    } else if ([1, 2, 4, 8, 16, 32].includes(minimal.length)) {
        // perfect data width match
        slot.type = [`uint${minimal.length * 8}`]
        slot.decoded = [byteArrayToInt(minimal)]
    } else if (minimal.length <= 20 && minimal.length > 16) {
        // addrss with leading zeros?
        slot.type = ['address', 'uint160']
        slot.decoded = [`0x${toHexString(minimal).padStart(20, '0')}`, byteArrayToInt(minimal)]
    } else if (minimal.length) {
        // maybe an imperfect uint match? fit into next int
        let fitWidth = (minimal.length + 7) & (-8)
        slot.type = [`uint${fitWidth}`]
        slot.decoded = [byteArrayToInt(minimal)]
    } else {
        // 🤷‍♂️
        slot.type = ['unknown']
    }
    return slot;
}

export default function analyzeStorage(arr) {
    let i = 0;
    for (let slotBytes of chop(arr, 32)) {
        console.log(analyzeSlot(slotBytes, i++))
    }
}
