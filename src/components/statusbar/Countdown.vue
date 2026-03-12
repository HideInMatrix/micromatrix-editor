<template>
  <TPopup
    :visible="visible"
    :attach="container"
    :z-index="2000"
    trigger="click"
    placement="top-left"
    :popper-options="popperOptions"
  >
    <slot />
    <template #content>
      <div class="mxm-preview-countdown">
        <div class="mxm-preview-countdown-title">
          <Icon name="time" /> {{ t('preview.countdown.title') }}
        </div>
        <TForm label-align="left" label-width="75px" @submit="startCountdown">
          <TFormItem
            :label="t('preview.countdown.select')"
            name="quickSelect"
          >
            <TSelect
              v-model="selectValue"
              :options="options"
              :placeholder="t('preview.countdown.selectTip')"
              :popup-props="{ attach: container, zIndex: 2000 }"
              @change="countdownSelect"
            />
          </TFormItem>
          <TFormItem :label="t('preview.countdown.custom')" name="custom">
            <div class="mxm-preview-countdown-input" size="small">
              <TInputNumber
                v-model="hours"
                theme="normal"
                align="center"
                :decimal-places="0"
                :placeholder="t('preview.countdown.hours')"
                :min="0"
                :max="60"
                :step="1"
                :disabled="selectValue !== null"
              />
              <TInputNumber
                v-model="minutes"
                theme="normal"
                align="center"
                :decimal-places="0"
                :placeholder="t('preview.countdown.minutes')"
                :min="0"
                :max="60"
                :step="1"
                :disabled="selectValue !== null"
              />
              <TInputNumber
                v-model="seconds"
                theme="normal"
                align="center"
                :decimal-places="0"
                :placeholder="t('preview.countdown.seconds')"
                :min="0"
                :max="60"
                :step="1"
                :disabled="selectValue !== null"
              />
            </div>
          </TFormItem>
          <TFormItem
            :label="t('preview.countdown.whenEnd')"
            name="endOptions"
          >
            <TRadioGroup v-model="whenEnd" default-value="showEndMessage">
              <TRadio value="showEndMessage">
                {{ t('preview.countdown.showEndMessage') }}</TRadio
              >
              <TRadio value="exitPreview">
                {{ t('preview.countdown.exitPreview') }}
              </TRadio>
            </TRadioGroup>
            <div></div>
          </TFormItem>
          <TFormItem>
            <TSpace size="small">
              <TButton theme="primary" type="submit">
                <Icon name="time" /> {{ t('preview.countdown.start') }}
              </TButton>
              <TButton theme="default" variant="base" @click="cancelCountdown">
                {{ t('preview.countdown.cancel') }}
              </TButton>
            </TSpace>
          </TFormItem>
        </TForm>
      </div>
    </template>
  </TPopup>
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const props = defineProps({
  visible: {
    type: Boolean,
    require: true,
  },
})

const emits = defineEmits(['countdown-change', 'exit-preivew', 'close'])

const container = inject('container')

const popperOptions = {
  modifiers: [
    {
      name: 'offset',
      options: {
        offset: [-10, 10],
      },
    },
  ],
}
const selectValue = $ref(null)
let hours = $ref(null)
let minutes = $ref(null)
let seconds = $ref(null)
const whenEnd = $ref('showEndMessage')

const options = [
  { label: t('preview.countdown.1hour'), value: 60 },
  { label: t('preview.countdown.45minutes'), value: 45 },
  { label: t('preview.countdown.30minutes'), value: 30 },
  { label: t('preview.countdown.15minutes'), value: 15 },
  { label: t('preview.countdown.10minutes'), value: 10 },
  { label: t('preview.countdown.5minutes'), value: 5 },
  { label: t('preview.countdown.custom'), value: null },
]

const countdownSelect = (value) => {
  minutes = value
}

let countdownInfo = $ref('')
let messageBox = null
let countdownInterval = null
const resetCountdown = () => {
  hours = null
  minutes = null
  seconds = null
  countdownInfo = ''
}
const startCountdown = async () => {
  if (messageBox) {
    messageBox.close()
  }
  if (countdownInterval !== null) {
    clearInterval(countdownInterval)
  }
  const totalSeconds =
    (hours || 0) * 3600 + (minutes || 0) * 60 + (seconds || 0)

  if (totalSeconds <= 0) {
    messageBox = await useMessage('error', {
      attach: container,
      content: t('preview.countdown.error'),
    })
    return
  }

  let remainingTime = totalSeconds

  countdownInterval = setInterval(async () => {
    if (remainingTime <= 0) {
      if (messageBox) {
        messageBox.close()
      }
      resetCountdown()
      if (countdownInterval !== null) {
        clearInterval(countdownInterval)
      }
      if (whenEnd === 'showEndMessage') {
        countdownInfo = ''
        messageBox = await useMessage('error', {
          attach: container,
          content: t('preview.countdown.endCountdown'),
          duration: 5000,
          closeBtn: true,
        })
      }
      if (whenEnd === 'exitPreview') {
        emits('exit-preivew')
      }
      return
    }
    remainingTime--
    countdownInfo = `${t('preview.countdown.remaining')}: ${String(Math.floor(remainingTime / 3600)).padStart(2, '0')}:${String(Math.floor((remainingTime % 3600) / 60)).padStart(2, '0')}:${String(remainingTime % 60).padStart(2, '0')}`
  }, 1000)

  emits('close')
}

const cancelCountdown = () => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
  resetCountdown()
  emits('close')
}

watch(
  () => countdownInfo,
  (value) => {
    emits('countdown-change', value)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (countdownInterval !== null) {
    clearInterval(countdownInterval)
  }
  if (messageBox) {
    messageBox.close()
  }
})
</script>

<style lang="less" scoped>
.mxm-preview-countdown {
  padding: 25px;
  width: 320px;
  cursor: default;
  &-title {
    font-size: 18px;
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    :deep(.mxm-icon) {
      font-size: 24px;
      margin: -2px 6px 0 0;
    }
  }
  :deep(.mxm-form) {
    &__item {
      &:not(:last-child) {
        margin-bottom: 15px;
      }
      .mxm-radio-group {
        margin-top: 5px;
      }
      .mxm-button__text {
        display: flex;
        align-items: center;
        .mxm-icon {
          font-size: 16px;
          margin-right: 5px;
        }
      }
    }
    &__controls {
      margin-top: 10px;
    }
  }
  &-input {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 5px;
    :deep(.mxm-input-number) {
      width: 78px !important;
    }
  }
}
</style>
