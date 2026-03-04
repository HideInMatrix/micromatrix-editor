export default defineI18nConfig(() => ({
    legacy: false,
    fallbackLocale: "zh-CN",
    datetimeFormats: {
        'en': {
            short: { year: 'numeric', month: 'short', day: 'numeric' }
        },
        'zh-CN': {
            short: { year: 'numeric', month: 'long', day: 'numeric' }
        },
        'zh-TW': {
            short: { year: 'numeric', month: 'long', day: 'numeric' }
        }
    },
    numberFormats: {
        'en': {
            currency: { style: 'currency', currency: 'USD' }
        },
        'zh-CN': {
            currency: { style: 'currency', currency: 'CNY' }
        },
        'zh-TW': {
            currency: { style: 'currency', currency: 'CNY' }
        }
    }
}))