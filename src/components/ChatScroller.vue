<template>
  <div
    ref="scrollerWrapper"
    class="scroller-wrapper"
    @scroll.passive="onScroll">

    <slot
      v-for="(item, i) in viewPool"
      :item="item"
      :index="visiblePoolStart + i"
      class="item-wrapper" />

  </div>
</template>

<script>
const scrolledBottom = ({ scrollTop: st, scrollHeight: sh, clientHeight: ch }, buffer = 0) => Math.ceil(st + ch + buffer) >= sh
const scrolledTop = ({ scrollTop: st }, buffer = 0) => Math.ceil(st - buffer) <= 0

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
    viewPoolSizeMult: {
      type: Number,
      required: false,
      default: 2,
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
      onTop: !this.startBottom,
      blockScrollDown: false,
      blockScrollUp: false,
      prevFirstID: undefined,
      prevLastID: undefined,
    }
  },
  computed: {
    viewPool () {
      return this.itemPool.slice(this.visiblePoolStart, this.visiblePoolEnd)
    },

    isLastViewPool () {
      return this.visiblePoolEnd >= this.itemPool.length
    },

    isFirstViewPool () {
      return this.visiblePoolStart <= 0
    },
    adjustedViewPoolSize () {
      return this.visiblePoolSize * this.viewPoolSizeMult
    },

    isViewPoolFull () {
      return this.adjustedViewPoolSize <= this.viewPool.length
    },

    currentViewPoolSize () {
      return this.visiblePoolEnd - this.visiblePoolStart
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
        if (this.prevLastID === undefined) {
          this.prevLastID = this.itemPool[this.itemPool.length - 1].id
        }
        if (!this.initialized) {
          this.init()
          this.initialized = true
          return
        }

        let target = this.$refs.scrollerWrapper
        console.debug({ prevFirstID: this.prevFirstID, crtFirstID: this.itemPool[0].id })
        let displace = 0
        let vpf = this.isViewPoolFull
        if (this.prevFirstID !== this.itemPool[0].id) {
          while (this.itemPool[displace].id !== this.prevFirstID && displace < this.itemPool.length) { displace++ }
          this.prevFirstID = this.itemPool[0].id
          console.debug({ displace })

          // Shift pool by displaced items
          this.visiblePoolEnd += displace
            this.visiblePoolStart += displace
          console.debug({ visiblePoolEnd: this.visiblePoolEnd, visiblePoolStart: this.visiblePoolStart, vpf, onTop: this.onTop })

            this.onScrollTop({ target })
          return
        }

        // Possible new item
        let end = this.itemPool.length

        // Preserve current position if view pool is full, user not scrolled to bottom & new item arrives
        if (vpf && !this.onBottom) {
          end = this.visiblePoolEnd
        }
        let start = this.visiblePoolStart + (end - this.visiblePoolEnd)

        let vps = (this.visiblePoolEnd - this.visiblePoolStart) >= this.adjustedViewPoolSize ? 0 : 1
        this.shiftViewPool({ end, start, vps, target, shrink: this.onBottom && this.isViewPoolFull, direction: 'down', downNoStick: !this.onBottom })

        const lastItem = this.itemPool[this.itemPool.length - 1]
        // Determine if message is alertable. Can specify explicitly that it's not.
        console.debug({ lastItem })
        if (!this.isLastViewPool && this.prevLastID !== lastItem.id && [undefined, true].indexOf(lastItem.alertable) > -1) {
          this.$emit('item:new:invisible', { id: lastItem.id, index: this.itemPool.length - 1, item: lastItem })
        }
        this.prevLastID = this.itemPool[this.itemPool.length - 1].id
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
    gotoItem ({ id, index }) {
      if (!id && !index) return 'item.invalidParams'

      if (index === undefined) {
        // Find index from id
        index = 0
        while (index < this.itemPool.length && this.itemPool[index].id !== id) { index++ }
        // edge case for index 0
        if (this.itemPool[index].id !== id) {
          return 'item.notFound'
        }
      }

      let isDown = this.visiblePoolStart < index
      if (!isDown) return 'direction.notSupported'

      // Scroll to
      // Adjust visible pool
      let target = this.$refs.scrollerWrapper
      let offset = index - this.visiblePoolStart
      let start, end

      start = index
      end = Math.min(this.itemPool.length, start + this.currentViewPoolSize)
      start -= this.currentViewPoolSize - (end - start)
      console.debug('gotoMessage', { start, end })

      this.shiftViewPool({
        start,
        end,
        vps: 0,
        target,
        shrink: this.isViewPoolFull,
        direction: isDown ? 'down' : 'up',
      })

      // Scroll to
      let domPos = Math.min(target.childElementCount - 1, index - this.visiblePoolStart)
      console.debug({ domPos })
      this.$nextTick(() => {
        target.children[domPos].scrollIntoView(!this.isLastViewPool)
      })

      return true
    },

    getPoolSizes () {
      const ref = this.$refs.scrollerWrapper
      const clientH = ref.clientHeight
      const minH = this.minHeight
      const visiblePoolSize = Math.ceil((clientH + 2 * this.buffer) / minH)
      console.debug('getPoolSizes', { ref, clientH, minH, visiblePoolSize, buffer: this.buffer })
      return { ref, clientH, minH, visiblePoolSize, buffer: this.buffer }
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
          this.visiblePoolEnd = Math.min(this.itemPool.length, this.visiblePoolStart + this.visiblePoolSize)
        }
      })
    },

    onScrollBottom ({ target }) {
      console.debug('scroll.bottom', { target })
      if (this.isLastViewPool) {
        console.debug('scroll.bottom.last')
        this.$emit('scroll:bottom:last')
      } else {
        this.$emit('scroll:bottom', { nextLast: this.visiblePoolEnd + this.visiblePoolSize >= this.itemPool.length })
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
    },

    onScrollTop ({ target }) {
      console.debug('scroll.top', { target })
      if (this.isFirstViewPool) {
        console.debug('scroll.top.first')
        this.$emit('scroll:top:first')
      } else {
        this.$emit('scroll:top', { nextLast: this.visiblePoolStart - this.visiblePoolSize <= 0 })
        this.blockScrollUp = true

        let vps = Math.min(this.visiblePoolSize, Math.min(this.visiblePoolStart, this.adjustedViewPoolSize - this.viewPool.length))
        if (this.onTop && vps === 0) {
          vps = Math.min(this.visiblePoolStart, this.visiblePoolSize)
        }
        console.debug({ vps, visiblePoolStart: this.visiblePoolStart, visiblePoolEnd: this.visiblePoolEnd, visiblePoolSize: this.visiblePoolSize })
        this.shiftViewPool({
          start: this.visiblePoolStart - vps,
          end: this.visiblePoolEnd - vps,
          target,
          shrink: this.isViewPoolFull,
          direction: 'up',
          vps,
        })
      }
    },

    // Handle view pools
    onScroll ({ target }) {
      if (target === undefined) return

      // This if structure is by design - removes the need to check scroll edges on
      // screen resize.
      this.onBottom = false
      this.onTop = false
      if (scrolledBottom(target) && !this.blockScrollDown) {
        this.onBottom = true
        this.onScrollBottom({ target })
      }

      if (scrolledTop(target) && !this.blockScrollUp) {
        this.onTop = true
        this.onScrollTop({ target })
      }
    },

    shiftViewPool ({ start, end, target, vps = this.visiblePoolSize, shrink = false, direction = 'down', downNoStick = true }) {
      console.debug('shiftViewPool', { start, end, vps, target, shrink, direction, downNoStick })

      if (direction === 'down') {
        const offset = target.scrollHeight - (target.scrollTop + target.clientHeight)
        console.debug({ offset })
        if (shrink) {
          this.visiblePoolStart = start
        }
          this.visiblePoolEnd = end
            this.$nextTick(() => {
          if (downNoStick) {
            target.children[target.children.length - vps - 1].scrollIntoView(false)
            target.scrollTop -= offset
          }  else  {
              target.scrollTop = target.scrollHeight
          }
            this.blockScrollDown = false
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
