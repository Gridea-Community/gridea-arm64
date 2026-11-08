import { localAssetURL } from './helpers/local-file'
import Vue from 'vue'
import { initAppearance } from './helpers/appearance'
initAppearance()
import moment from 'moment'
import Antd from 'ant-design-vue'
import 'remixicon/fonts/remixicon.css'
import 'katex/dist/katex.min.css'
import '@fontsource/noto-serif/index.css'
import '@/assets/styles/tailwind.css'
import '@/assets/styles/main.less'
import VueI18n from 'vue-i18n'
import Prism from '@/helpers/prism'
import VueShortkey from 'vue-shortkey'
import { ipcRenderer } from '@/helpers/renderer-bridge'
import locale from './assets/locales'
import { isAppLanguage, menuLocaleByLanguage, systemLanguage } from './helpers/app-language'
import App from './App.vue'
import router from './router'
import store from './store/index'
import VueBus from './vue-bus'
import ga from './helpers/analytics'
import { setRequiredMessage } from './helpers/vee-validate'

ga.event('Client', 'show', {
  evLabel: 'startup',
})



const savedLanguage = localStorage.getItem('language')
const initialLanguage = isAppLanguage(savedLanguage)
  ? savedLanguage
  : systemLanguage(ipcRenderer.sendSync('app-locale') || '')

Vue.use(VueI18n)
const i18n = new VueI18n({
  locale: initialLanguage,
  fallbackLocale: 'en',
  messages: locale as any,
  silentTranslationWarn: true,
})

function applyLanguage(value: string) {
  if (!isAppLanguage(value)) return
  document.documentElement.lang = menuLocaleByLanguage[value]
  setRequiredMessage(String(i18n.t('requiredField', value)))
  ipcRenderer.send('app-language', value)
}

applyLanguage(initialLanguage)

Prism.highlightAll()

Vue.use(Antd)
Vue.use(VueBus)
Vue.use(VueShortkey)
Vue.prototype.$moment = moment
Vue.prototype.$localURL = localAssetURL

Vue.config.productionTip = false

new Vue({
  router,
  store,
  i18n,
  watch: { '$i18n.locale': applyLanguage },
  render: h => h(App),
  mounted() {
    if (router.currentRoute.path === '/') router.replace('/articles').catch(() => {})
  },
}).$mount('#app')
