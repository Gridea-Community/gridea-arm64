import { required } from 'vee-validate/dist/rules'
import { extend } from 'vee-validate'

export function setRequiredMessage(message: string) {
  extend('required', {
    ...required,
    message,
  })
}
