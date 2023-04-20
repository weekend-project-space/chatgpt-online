import {
    micromark
} from 'micromark'
import {
    gfm,
    gfmHtml
} from 'micromark-extension-gfm'
import {
    math,
    mathHtml
} from 'micromark-extension-math'
const markOption = {
    extensions: [gfm(), math()],
    allowDangerousHtml: true,
    htmlExtensions: [gfmHtml(), mathHtml({
        strict: false
    })]
}
export default (v) => micromark(v, markOption)