export function setItem(obj) {
    for (let k in obj) {
        localStorage.setItem(k, obj[k])
    }
}
export function getItem(key) {
    return localStorage.getItem(key)
}