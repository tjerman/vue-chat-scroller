<template>
  <div
    ref="scrollerWrapper"
    class="scroller-wrapper"
    @scroll.passive="onScroll">

    <slot
      v-for="({ item, index }) in viewPool"
      :item="item"
      :index="index"
      class="item-wrapper" />

  </div>
</template>

<script>
const scrolledBottom = ({ scrollTop: st, scrollHeight: sh, clientHeight: ch }, buffer = 0) => st + ch + buffer + 1 >= sh
const scrolledTop = ({ scrollTop: st }, buffer = 0) => st - buffer - 1 <= 0

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
      initialized: false,
      onBottom: this.startBottom,
    }
  },
  computed: {
    viewPool () {
      return this.itemPool.slice(this.visiblePoolStart, this.visiblePoolEnd).map((item, index) => ({ item, index: this.visiblePoolStart + index }))
    },

    isLastViewPool () {
      return this.visiblePoolEnd + 1 >= this.itemPool.length
    },

    isFirstViewPool () {
      return this.visiblePoolStart <= 0
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
      console.debug('getPoolSizes', { ref, scrlH, minH, visiblePoolSize, buffer: this.buffer })
      return { ref, scrlH, minH, visiblePoolSize, buffer: this.buffer }
    },

    onResize () {
      let { ref, visiblePoolSize } = this.getPoolSizes()
      this.visiblePoolSize = visiblePoolSize

      // If user is scrolled down, keep them there
      if (this.onBottom) {
        ref.scrollTop = ref.scrollHeight
      }
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

    // Handle view pools
    onScroll ({ target }) {
      if (target === undefined) return

      // This if structure is by design - removes the need to check scroll edges on
      // screen resize.
      this.onBottom = false
      if (scrolledBottom(target)) {
        console.debug('scroll.bottom', { target })
        this.onBottom = true
        if (this.isLastViewPool) {
          console.debug('scroll.bottom.last')
          this.$emit('scroll.bottom.last')
        } else {
          this.$emit('scroll.bottom', { nextLast: this.visiblePoolEnd + this.visiblePoolSize >= this.itemPool.length })
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
          console.debug('scroll.top.first')
          this.$emit('scroll.top.first')
        } else {
          this.$emit('scroll.top', { nextLast: this.visiblePoolStart - this.visiblePoolSize <= 0 })
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
        target.scrollTop -= 1
        if (shrink) {
          this.visiblePoolStart = start
        }
        setTimeout(() => {
          this.visiblePoolEnd = end
          target.scrollTop += 1
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
