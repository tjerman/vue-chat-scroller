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
// Helpers to determine edge scroll positions
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
  },

  data () {
    return {
      // General
      initialized: false,

      // Pool params
      visiblePoolStart: 0,
      visiblePoolEnd: 0,
      visiblePoolSize: 0,

      // Current edge position
      onBottom: this.startBottom,
      onTop: !this.startBottom,

      // Locks
      blockScrollDown: false,
      blockScrollUp: false,

      // Item pool changes
      prevFirstID: undefined,
      prevLastID: undefined,
    }
  },
  computed: {
    getItemPool () {
      if (!this.initialized) {
        return
      }

      return this.itemPool
    },

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
    getItemPool: {
      immediate: true,
      handler: function (nval) {
        if (!nval) {
          return
        }

        let target = this.$refs.scrollerWrapper
        let vpf = this.isViewPoolFull

        // Handle new items
        if (this.prevLastID !== (this.itemPool[this.itemPool.length - 1] || {}).id) {
          this.onItemBelow({ target, vpf, stickBottom: this.onBottom })
          this.emitItemInvisible(this.itemPool.length - 1, !this.isFirstViewPool)
        } else if (this.prevFirstID !== (this.itemPool[0] || {}).id) {
          this.onItemAbove({ target, stickTop: this.onTop && !this.startBottom })
          this.emitItemInvisible(0, !this.isFirstViewPool)
        }

        // Meta
        this.prevFirstID = (this.itemPool[0] || {}).id
        this.prevLastID = (this.itemPool[this.itemPool.length - 1] || {}).id
      },
    },
  },

  mounted () {
    this.init()
    window.addEventListener('resize', this.onResize)
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.onResize)
  },

  methods: {
    emitItemInvisible (index, condition) {
      const item = this.itemPool[index]
      if (condition && [undefined, true].indexOf(item.alertable) > -1) {
        this.$emit('item:new:invisible', { id: item.id, index, item })
      }
    },

    onItemAbove ({ target, stickTop }) {
      // Recalculate visible pool's indexes
      let displace = 0
      while (displace < this.itemPool.length && this.itemPool[displace].id !== this.prevFirstID) {
        displace++
      }

      this.visiblePoolEnd += displace
      this.visiblePoolStart += displace

      this.onScrollTop({ target, stickTop })
    },

    onItemBelow ({ target, vpf, stickBottom }) {
      if (vpf && !this.onBottom) {
        // Preserve current pool
        return
      }

      this.onScrollBottom({ target, stickBottom })
    },

    // @todo clean this up
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
      // let offset = index - this.visiblePoolStart
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
        // General params
        this.visiblePoolSize = this.getPoolSizes().visiblePoolSize

        // View pool params
        if (this.startBottom) {
          this.visiblePoolEnd = this.itemPool.length || 0
          this.visiblePoolStart = Math.max(0, this.visiblePoolEnd - this.visiblePoolSize)
          this.$nextTick(() => {
            this.$refs.scrollerWrapper.scrollTop = this.$refs.scrollerWrapper.scrollHeight
            this.onBottom = true
          })
        } else {
          this.visiblePoolEnd = Math.min(this.itemPool.length, this.visiblePoolStart + this.visiblePoolSize)
          this.onTop = true
        }

        this.initialized = true
      })
    },

    onScrollBottom ({ target, stickBottom }) {
      if (this.isLastViewPool) {
        this.$emit('scroll:bottom:last')
      } else {
        this.blockScrollDown = true

        let vps = Math.min(this.itemPool.length - this.visiblePoolEnd, this.visiblePoolSize)

        this.shiftViewPool({
          start: this.visiblePoolStart + vps,
          end: this.visiblePoolEnd + vps,
          vps,
          target,
          shrink: this.isViewPoolFull,
          direction: 'down',
          stickBottom,
        })

        this.$emit('scroll:bottom', { nextLast: this.visiblePoolEnd + this.visiblePoolSize >= this.itemPool.length, lastViewPool: this.isLastViewPool, firstViewPool: this.isFirstViewPool })
      }
    },

    onScrollTop ({ target, stickTop }) {
      if (this.isFirstViewPool) {
        this.$emit('scroll:top:first')
      } else {
        this.blockScrollUp = true

        let vps = Math.min(this.visiblePoolSize, this.visiblePoolStart)
        this.shiftViewPool({
          start: this.visiblePoolStart - vps,
          end: this.visiblePoolEnd - vps,
          target,
          shrink: this.isViewPoolFull,
          direction: 'up',
          vps,
          stickTop,
        })

        this.$emit('scroll:top', { nextLast: this.visiblePoolStart - this.visiblePoolSize <= 0, lastViewPool: this.isLastViewPool, firstViewPool: this.isFirstViewPool })
      }
    },

    // Handle view pools
    onScroll ({ target }) {
      if (target === undefined) {
        return
      }

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

    shiftViewPool ({ start, end, target, vps = this.visiblePoolSize, shrink = false, direction = 'down', stickBottom = false, stickTop = false }) {
      if (direction === 'down') {
        // New view pool indexes
        if (shrink) {
          this.visiblePoolStart = start
        }
        this.visiblePoolEnd = end

        // Determine new scrollTopPosition with the help of last node & root's offset
        const offset = ((target.children[target.children.length - 1] || {}).offsetTop || 0) - target.scrollTop
        this.$nextTick(() => {
          if (stickBottom) {
            target.scrollTop = target.scrollHeight
          } else {
            target.scrollTop = target.children[target.children.length - vps - 1].offsetTop - offset
          }
          this.blockScrollDown = false
        })
      } else if (direction === 'up') {
        if (shrink) {
          this.visiblePoolEnd = end
        }
        this.visiblePoolStart = start

        // Determine new scrollTopPosition with the help of first node and target's scrollTop
        const offset = ((target.children[0] || {}).offsetTop || 0) - target.scrollTop
        this.$nextTick(() => {
          if (stickTop) {
            target.scrollTop = 0
          } else {
            target.scrollTop = ((target.children[vps] || {}).offsetTop || 0) - offset
          }
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
