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

  data () {
    return {
      visiblePoolStart: 0,
      visiblePoolEnd: 0,
      visiblePoolSize: 0,
      shrink: false,
      lastScrollPos: 0,
      scrollDir: this.startBottom ? 'down' : 'up',
      initialized: false,
      onBottom: this.startBottom,
    }
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

  watch: {
    itemPool: {
      immediate: true,
      handler: function (nval = []) {
        if (nval.length <= 0) return
        if (!this.initialized) {
          this.init()
          this.initialized = true
          return
        }
        // Possible new item
        let end = this.itemPool.length
        let start = this.visiblePoolStart + (end - this.visiblePoolEnd)
        if (this.isLastViewPool) {
          this.shiftViewPool({ end, start, target: this.$refs.scrollerWrapper, shrink: this.onBottom, direction: 'down', downNoStick: !this.onBottom })
        }
      },
    },
  },

  mounted () {
    window.addEventListener('resize', this.onResize)
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.onResize)
  },

  methods: {
    getPoolSizes () {
      const ref = this.$refs.scrollerWrapper
      const scrlH = ref.clientHeight
      const minH = this.minHeight
      const visiblePoolSize = Math.ceil((scrlH + 2 * this.buffer) / minH)
      console.debug({ ref, scrlH, minH, visiblePoolSize, buffer: this.buffer })
      return { ref, scrlH, minH, visiblePoolSize, buffer: this.buffer }
    },

    onResize () {
      let { ref, visiblePoolSize } = this.getPoolSizes()
      this.visiblePoolSize = visiblePoolSize

      if (this.onBottom) {
        ref.scrollTop = ref.scrollHeight
      }
    },

    topRem () {
      this.visiblePoolStart++
    },
    topAdd () {
      this.visiblePoolStart--
    },
    botRem () {
      this.visiblePoolEnd--
    },
    botAdd () {
      this.visiblePoolEnd++
    },
    init () {
      this.$nextTick(() => {
        let { visiblePoolSize } = this.getPoolSizes()
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
          this.shiftViewPool({
            start: Math.min(this.itemPool.length - this.visiblePoolSize, this.visiblePoolStart + this.visiblePoolSize),
            end: Math.min(this.itemPool.length, this.visiblePoolEnd + this.visiblePoolSize),
            target,
            shrink: this.shrink,
            direction: 'down',
          })
          this.shrink = true
        }
      }
      if (scrolledTop(target)) {
        console.debug('scroll.top', { target })
        if (this.isFirstViewPool) {
          console.debug('pool.end.first')
          this.$emit('pool.end.first')
        } else {
          this.shiftViewPool({
            start: Math.max(0, this.visiblePoolStart - this.visiblePoolSize),
            end: Math.max(0, this.visiblePoolEnd - this.visiblePoolSize),
            target,
            shrink: this.shrink,
            direction: 'up',
          })
          this.shrink = true
        }
      }
    },

    shiftViewPool ({ start, end, target, shrink = false, direction = 'down', downNoStick = true }) {
      console.debug('shiftViewPool', { start, end, target, shrink, direction, downNoStick })

      if (direction === 'down') {
        target.scrollTop = target.scrollTop - 1
        if (shrink) {
          this.visiblePoolStart = start
        }
        setTimeout(() => {
          this.visiblePoolEnd = end
          if (!downNoStick) {
            this.$nextTick(() => {
              target.scrollTop = target.scrollHeight
            })
          }
        }, 0)
      } else if (direction === 'up') {
        const prevOffset = target.scrollTop
        if (shrink) {
          this.visiblePoolEnd = end
        }
        this.visiblePoolStart = start
        setTimeout(() => {
          // Scroll down to the previus first element
          const prevChild = target.children[this.visiblePoolSize]
          prevChild.scrollIntoView()
          target.scrollTop += prevOffset
        }, 0)
      }
    },
  },
}

</script>

<style scoped lang="scss">
.scroller-wrapper {
  overflow-y: scroll;
}

</style>
