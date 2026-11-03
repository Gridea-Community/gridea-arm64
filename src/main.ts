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
import App from './App.vue'
import router from './router'
import store from './store/index'
import VueBus from './vue-bus'
import ga from './helpers/analytics'
import './helpers/vee-validate'

ga.event('Client', 'show', {
  evLabel: 'startup',
})



const defaultLocale = ({
  'zh-CN': 'zhHans',
  'zh-TW': 'zh_TW',
  'en-US': 'en',
} as any)[ipcRenderer.sendSync('app-locale') || 'zh-CN']

Vue.use(VueI18n)
const i18n = new VueI18n({
  locale: localStorage.getItem('language') || defaultLocale,
  messages: locale as any,
  silentTranslationWarn: true,
})

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
  render: h => h(App),
  mounted() {
    if (router.currentRoute.path === '/') router.replace('/articles').catch(() => {})
  },
}).$mount('#app')
