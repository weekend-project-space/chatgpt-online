export function setItem(obj, isSync) {
    if (isSync && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set(obj);
    } if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set(obj);
    } else {
        for (let k in obj) {
            localStorage.setItem(k, obj[k])
        }
    }
}
export async function getItem(key, isSync) {
    if (isSync && chrome.storage && chrome.storage.sync) {
        let d = await chrome.storage.sync.get([key])
        return d[key]
    } else if (chrome.storage && chrome.storage.local && chrome.storage.local.get) {
        let d = await chrome.storage.local.get([key])
        return d[key]
    } else {
        return localStorage.getItem(key)
    }
}

