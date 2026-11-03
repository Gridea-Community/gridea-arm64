import { AllElectron } from 'electron'
import moment from 'moment'

declare module 'vue/types/vue' {
  interface Vue {
    readonly $electron: AllElectron,
    $bus: any,
    $moment: typeof moment,
    $localURL: (value: string) => string,
  }
}
