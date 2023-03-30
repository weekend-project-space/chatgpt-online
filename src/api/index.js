import {
    get,
    post
} from '../utils/request'

const base = 'https://api.bitmagic.space/'

export function auth(email) {
    return post(base + '/auth?email=' + email)
}

export function login(code, key) {
    return post(base + '/auth/login?code=' + code + '&key=' + key)
}

export function ticket() {
    return get(base + '/v1/chat/ticket-qty')
}

export function useCdKey(cdKeyCode) {
    return post(base + '/ticket/use-cd-key?cdKeyCode=' + cdKeyCode)
}

export function getMoreInfo() {
    return get(base + '/ticket/more-info')
}

export function inviteLink(inviteCode) {
    return post(base + '/ticket/invite-link?inviteCode=' + inviteCode)
}

export function chat(data) {
    return post(base + '/v1/chat/completions', data, {
        headers: {
            "Content-Type": "application/json"
        }
    })
}