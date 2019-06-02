<template>
  <div
    ref="scrollerWrapper"
    class="scroller-wrapper"
    @scroll.passive="onScroll">

    <slot
      v-for="(item, i) in viewPool"
      :item="item"
      :index="i"
      class="item-wrapper" />

  </div>
</template>

<script>
const scrolledBottom = ({ scrollTop: st, scrollHeight: sh, clientHeight: ch }, buffer = 0) => st + ch + buffer + 1 >= sh
const scrolledTop = ({ scrollTop: st, buffer = 0 }) => st - buffer - 1 <= 0

export default {
  props: {
    itemPool: {
      type: Array,
      required: true,
      default: () => [],
    },
    minHeight: {
      type: Number,
      required: true,
      default: 0,
    },
    buffer: {
      type: Number,
      required: false,
      default: 200,
    },
    startBottom: {
      type: Boolean,
      required: false,
      default: false,
    },
    // @todo
    addaptiveBuffer: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  computed: {
    viewPool () {
      return this.itemPool.slice(this.visiblePoolStart, this.visiblePoolEnd)
    },

    isLastViewPool () {
      return this.visiblePoolEnd + 1 >= this.itemPool.length
    },

    isFirstViewPool () {
      return this.visiblePoolStart <= 0
    },

    scrollDown () {
      return this.scrollDir === 'down'
    },
    scrollUp () {
      return this.scrollDir === 'up'
    },
  },

  methods: {
    getPoolSizes () {
      const ref = this.$refs.scrollerWrapper
      const scrlH = ref.clientHeight
      const minH = this.minHeight
      const visiblePoolSize = Math.ceil((scrlH + 2*this.buffer) / minH)
      console.debug({ ref, scrlH, minH, visiblePoolSize, buffer: this.buffer })
      return { ref, scrlH, minH, visiblePoolSize, buffer: this.buffer }
    },

    onResize () {
      let { ref, scrlH, minH, visiblePoolSize } = this.getPoolSizes()
      this.visiblePoolSize = visiblePoolSize

      if (this.onBottom) {
        ref.scrollTop = ref.scrollHeight
      }
    },

    topRem () {
      this.visiblePoolStart ++
    },
    topAdd () {
      this.visiblePoolStart --
    },
    botRem () {
      this.visiblePoolEnd --
    },
    botAdd () {
      this.visiblePoolEnd ++
    },
    init () {
      this.$nextTick(() => {
        let { ref, scrlH, minH, visiblePoolSize } = this.getPoolSizes()
        this.visiblePoolSize = visiblePoolSize

        if (this.startBottom) {
          this.visiblePoolEnd = this.itemPool.length
          this.visiblePoolStart = this.visiblePoolEnd - this.visiblePoolSize
          this.$nextTick(() => {
            this.$refs.scrollerWrapper.scrollTop = this.$refs.scrollerWrapper.scrollHeight
          })
        } else {
          this.visiblePoolEnd = this.visiblePoolStart + this.visiblePoolSize
        }
      })
    },
    onScroll (e) {
      const { target } = e

      this.scrollDir = this.lastScrollPos < target.scrollTop ? 'down' : 'up'
      this.lastScrollPos = target.scrollTop

      // Check if window should change
      this.onBottom = false
      if (scrolledBottom(target)) {
        console.debug('scroll.bottom', { target })
        this.onBottom = true
        if (this.isLastViewPool) {
          console.debug('pool.end.last')
          this.$emit('pool.end.last')
        } else {
        target.scrollTop = target.scrollTop - 1
        if (!this.initial) {
            this.visiblePoolStart = Math.min(this.itemPool.length - this.visiblePoolSize, this.visiblePoolStart + this.visiblePoolSize)
        }
        setTimeout(() => {
            this.visiblePoolEnd = Math.min(this.itemPool.length, this.visiblePoolEnd + this.visiblePoolSize)
          this.initial = false
        }, 0)
        }
      }
      if (scrolledTop(target)) {
        console.debug('scroll.top', { target })
        if (this.isFirstViewPool) {
          console.debug('pool.end.first')
          this.$emit('pool.end.first')
        } else {
        const prevOffset = target.scrollTop
        if (!this.initial) {
          this.visiblePoolEnd -= this.visiblePoolSize
        }
        this.visiblePoolStart -= this.visiblePoolSize
        this.initial = false
        setTimeout(() => {
            // Scroll down to the previus first element
            const prevChild = target.children[this.visiblePoolSize]
          prevChild.scrollIntoView()
          target.scrollTop += prevOffset
        }, 0)
        }
      }
    },
  },

  mounted () {
    window.addEventListener('resize', this.onResize)
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.onResize)
  },

  data () {
    return {
      visiblePoolStart: 0,
      visiblePoolEnd: 0,
      visiblePoolSize: 0,
      initial: true,
      lastScrollPos: 0,
      scrollDir: undefined,
      initialized: false,
      onBottom: this.startBottom,
    }
  },

  watch: {
    itemPool: {
      immediate: true,
      handler: function (nval = []) {
        if (nval.length <= 0 || this.initialized) return
        this.init()
        this.initialized = true
      },
    }
  },
}

</script>

<style scoped lang="scss">
.scroller-wrapper {
  overflow-y: scroll;
}

</style>
