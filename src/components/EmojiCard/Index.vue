<template>
  <div class="emoji-card">
    <VEmojiPicker :showSearch="false" :emojisByRow="8" :emojiSize="40" :emojiWithBorder="false" @select="handleSelect" />
  </div>
</template>

<script lang="ts">
import {
  Vue, Component,
} from 'vue-property-decorator'
import { VEmojiPicker } from 'v-emoji-picker'

@Component({
  components: {
    VEmojiPicker,
  },
})
export default class EmojiCard extends Vue {
  handleSelect(emojiData: { data: string }) {
    this.$emit('select', emojiData.data)
  }
}
</script>

<style lang="less" scoped>
.emoji-card {
  margin: -14px -17px;
}
/deep/ #EmojiPicker {
  background: #fff;
  color: #000;
  #Categories {
    background: #fff;
    border-bottom: 1px solid #efefef;
  }
  .category {
    transition: all 0.3s ease;
    cursor: default;
    &:hover {
      background: #efefef;
    }
  }
  .category.active {
    border-bottom: 2px solid #000;
    padding-bottom: 3px;
  }

  ::-webkit-scrollbar {
    background-color: #fff;
  }

  ::-webkit-scrollbar-thumb {
    background-color: #eee;
    opacity: 0.7;
  }
  #Emojis {
    font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif;
  }
  .emoji {
    font-size: 25px !important;
    cursor: default;
    width: 40px;
    height: 40px;
    line-height: 44px !important;
    padding: 0;
    border-radius: 8px;
    transition: all 0.3s ease;
    max-height: none;
    &:hover {
      background: #efefef;
      transform: none;
    }
  }
  #VSvg {
    line-height: 16px;
  }
}
</style>
