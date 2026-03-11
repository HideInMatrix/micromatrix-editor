import 'vue'
import type { InjectionKey } from 'vue'

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, never>, Record<string, never>, any>
  export default component
}

declare module 'virtual:svg-icons-register'

declare global {
  type WidenLiteral<T> = T extends string
    ? string
    : T extends number
      ? number
      : T extends boolean
        ? boolean
        : T

  const $ref: <T>(value: T) => WidenLiteral<T>
  const $computed: <T>(getter: () => T) => T

  const echarts: any
  const Plyr: any
  const mermaid: any
  const katex: any
}

declare module 'vue' {
  export function inject<T = any>(key: InjectionKey<T> | string): T
  export function inject<T>(
    key: InjectionKey<T> | string,
    defaultValue: T,
    treatDefaultAsFactory?: false,
  ): T
  export function inject<T>(
    key: InjectionKey<T> | string,
    defaultValue: T | (() => T),
    treatDefaultAsFactory: true,
  ): T
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    t: typeof import('./composables/i18n').t
    l: typeof import('./composables/i18n').l
  }
}

export {}
