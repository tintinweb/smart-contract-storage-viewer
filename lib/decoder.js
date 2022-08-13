function isAllASCII(arr) {
    return !!arr.filter(e => e >= 32 && e <= 126).length
}

function toHexString(byteArray) {
    return Array.from(byteArray, function (byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('')
}

function byteArrayToInt(byteArray) {
    var value = 0;
    let arr = byteArray.slice().reverse()
    for (var i = arr.length - 1; i >= 0; i--) {
        value = (value * 256) + arr[i];
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


function analyzeSlot(arr, slotNr) {
    let ltrMinimal = getMinimalSlotDataLength(arr);
    let rtlMinimal = getMinimalSlotDataLength(arr.slice().reverse());
    let startSeqence = arr.slice(0, arr.indexOf(0));
    let slot = {
        guess: {},
        raw: {
            data: arr
        },
    }

    if (ltrMinimal.length == 0) {
        slot.guess['uint256'] = 0;
        slot.guess['bool'] = false;
        slot.guess['mapping_base'] = `keccak256(uint256(key) . uint256(${slotNr})`;
        slot.guess['dynArray[0]_base'] = `keccak256(${slotNr})`;
        slot.guess['empty'] = undefined;
    } else if (ltrMinimal.length != 0
        && arr[arr.length - 1] != 0
        && arr[arr.length - 1] % 2 == 0
        & startSeqence.length == arr[arr.length - 1] / 2) {
        // short string that fits into one slot
        let len = Math.floor(arr[arr.length - 1] / 2)
        if (isAllASCII(startSeqence)) {
            slot.guess[`string_short[${len}]`] = new TextDecoder("utf-8").decode(new Uint8Array(startSeqence))
        } else {
            slot.guess[`bytes_short[${len}]`] = new TextDecoder("utf-8").decode(new Uint8Array(startSeqence))
        }
    } else if(ltrMinimal.length==32 && rtlMinimal.length!=32){
        slot.guess[`bytes_short[${rtlMinimal.length}]`] = new TextDecoder("utf-8").decode(new Uint8Array(rtlMinimal.slice().reverse()))
    } else if (ltrMinimal.length == 1 && arr[arr.length - 1] == 1) {
        // likely bool true or int 1
        slot.guess['bool'] = true;
        slot.guess['uint8'] = 1;
        slot.guess['dynArray[1]_base'] = `keccak256(${slotNr})`;
    } else if ([1, 2, 4, 8, 16, 32].includes(ltrMinimal.length)) {
        // perfect data width match
        let intVal = byteArrayToInt(ltrMinimal)
        slot.guess[`uint${ltrMinimal.length * 8}`] = intVal.toString()
        if(ltrMinimal.length == 32){
            slot.guess[`keccak256256`] = `0x${toHexString(ltrMinimal).padStart(20, '0')}`
            slot.guess[`slot`] = `0x${toHexString(ltrMinimal).padStart(20, '0')}`
        } else if (ltrMinimal.length <= 2 && intVal < 10000){
            slot.guess[`dynArray[${intVal.toString()}]_base`] = `keccak256(${slotNr})`; //assume typically < 256 items
        }
    } else if (ltrMinimal.length <= 20 && ltrMinimal.length > 16) {
        // addrss with leading zeros?
        slot.guess['address'] = `0x${toHexString(ltrMinimal).padStart(20, '0')}`
        slot.guess['uint160'] = byteArrayToInt(ltrMinimal).toString()
    } else if (ltrMinimal.length) {
        // maybe an imperfect uint match? fit into next int
        let fitWidth = [1, 2, 4, 8, 16, 32].find(e => e > ltrMinimal.length)
        slot.guess[`uint${fitWidth*8}`] = byteArrayToInt(ltrMinimal).toString()
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
        ret[currSlot] = analyzeSlot(slotBytes, startSlot+i);
        i++;
    }
    return ret;
}
