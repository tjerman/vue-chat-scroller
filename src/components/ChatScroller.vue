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
      initialized: false,
      onBottom: this.startBottom,
      blockScrollDown: false,
      blockScrollUp: false,
      prevFirstID: undefined,
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
    isViewPoolFull () {
      return this.visiblePoolSize <= this.viewPool.length
    },
  },

  watch: {
    itemPool: {
      immediate: true,
      handler: function (nval = []) {
        if (nval.length <= 0) return
        if (this.prevFirstID === undefined) {
          this.prevFirstID = this.itemPool[0].id
        }
        if (!this.initialized) {
          this.init()
          this.initialized = true
          return
        }

        console.debug({ prevFirstID: this.prevFirstID, crtFirstID: this.itemPool[0].id })
        let displace = 0
        if (this.prevFirstID !== this.itemPool[0].id) {
          while (this.itemPool[displace].id !== this.prevFirstID && displace < this.itemPool.length) { displace++ }
          this.prevFirstID = this.itemPool[0].id
          console.debug({ displace })
          let vpf = this.isViewPoolFull

          // Shift pool by displaced items
          this.visiblePoolEnd += displace
          console.debug({ visiblePoolEnd: this.visiblePoolEnd })

          if (vpf) {
            this.visiblePoolStart += displace
          } else {
            // Offset to maximize pools available size
            let startOffset = Math.max(0, (this.visiblePoolEnd - this.visiblePoolStart) - this.visiblePoolSize * 2)
            console.debug({ startOffset })
            this.visiblePoolStart += startOffset
          }
        }

        // Possible new item
        let end = this.itemPool.length
        let start = this.visiblePoolStart + (end - this.visiblePoolEnd)
        if (this.isLastViewPool) {
          this.shiftViewPool({ end, start, target: this.$refs.scrollerWrapper, shrink: this.onBottom && this.isViewPoolFull, direction: 'down', downNoStick: !this.onBottom })
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
          this.visiblePoolEnd = this.itemPool.length || 0
          this.visiblePoolStart = Math.max(0, this.visiblePoolEnd - this.visiblePoolSize)
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
      if (scrolledBottom(target) && !this.blockScrollDown) {
        console.debug('scroll.bottom', { target })
        this.onBottom = true
        if (this.isLastViewPool) {
          console.debug('scroll.bottom.last')
          this.$emit('scroll.bottom.last')
        } else {
          this.$emit('scroll.bottom', { nextLast: this.visiblePoolEnd + this.visiblePoolSize >= this.itemPool.length })
          this.blockScrollDown = true
          let vps = this.visiblePoolSize
          if (this.visiblePoolEnd + vps >= this.itemPool.length) {
            vps = Math.min(this.itemPool.length - this.visiblePoolEnd, this.visiblePoolSize)
          }

          this.shiftViewPool({
            start: this.visiblePoolStart + vps,
            end: this.visiblePoolEnd + vps,
            vps,
            target,
            shrink: this.isViewPoolFull,
            direction: 'down',
          })
        }
      }

      if (scrolledTop(target) && !this.blockScrollUp) {
        console.debug('scroll.top', { target })
        if (this.isFirstViewPool) {
          console.debug('scroll.top.first')
          this.$emit('scroll.top.first')
        } else {
          this.$emit('scroll.top', { nextLast: this.visiblePoolStart - this.visiblePoolSize <= 0 })
          this.blockScrollUp = true

          let vps = this.visiblePoolSize
          if (this.visiblePoolStart <= this.visiblePoolSize) {
            vps = this.visiblePoolStart
          }
          this.shiftViewPool({
            start: Math.max(0, this.visiblePoolStart - vps),
            end: Math.max(0, this.visiblePoolEnd - vps),
            target,
            shrink: this.isViewPoolFull,
            direction: 'up',
            vps,
          })
        }
      }
    },

    shiftViewPool ({ start, end, target, vps = this.visiblePoolSize, shrink = false, direction = 'down', downNoStick = true }) {
      console.debug('shiftViewPool', { start, end, target, shrink, direction, downNoStick })

      if (direction === 'down') {
        target.scrollTop -= 1
        if (shrink) {
          this.visiblePoolStart = start
        }
        this.$nextTick(() => {
          this.visiblePoolEnd = end
          target.scrollTop += 1
          if (!downNoStick) {
            this.$nextTick(() => {
              target.scrollTop = target.scrollHeight
              this.blockScrollDown = false
            })
          } else {
            this.blockScrollDown = false
          }
        })
      } else if (direction === 'up') {
        const prevOffset = target.scrollTop
        if (shrink) {
          this.visiblePoolEnd = end
        }
        this.visiblePoolStart = start
        this.$nextTick(() => {
          // Scroll down to the previus first element
          const prevChild = target.children[vps]
          prevChild.scrollIntoView()
          target.scrollTop += prevOffset
          this.blockScrollUp = false
        })
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
