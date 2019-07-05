<template>
  <div class="wrapper">
    <div
      ref="chatWrapper"
      class="chat"
      @scroll.passive="onScroll">

      <slot
        v-for="(item, i) in viewPool"
        :item="item"
        :index="visiblePoolStart + i"
        class="item-wrapper" />

    </div>

    <scrollbar
      v-if="loaded"
      class="scrollbar"
      :class="{ visible: scrollbarPerminant }"
      :scrollable="$refs.chatWrapper"
      @drag:start="scrollbarPerminant=true"
      @drag:end="scrollbarPerminant=false" />

  </div>
</template>

<script>
import Scrollbar from './Scrollbar'

// Helpers to determine edge scroll positions
const scrolledBottom = ({ scrollTop: st, scrollHeight: sh, clientHeight: ch }, buffer = 0) => Math.ceil(st + ch + buffer) >= sh
const scrolledTop = ({ scrollTop: st }, buffer = 0) => Math.ceil(st - buffer) <= 0

export default {
  components: {
    Scrollbar,
  },

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

      // Scrollbar
      scrollbarPerminant: false,
      loaded: false,
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

        let target = this.$refs.chatWrapper
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

    this.loaded = true
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

    gotoItem ({ id, index }) {
      if (id === undefined && index === undefined) {
        throw new Error('item.invalidParams', { id, index })
      }

      // Determine item's index
      if (index === undefined) {
        // Find index from id
        index = 0
        index = this.itemPool.findIndex((v) => v.id === id)
      }

      if (this.itemPool[index] === undefined) {
        throw new Error('item.notFound', { id, index })
      }

      // Adjust pool if not correct
      if (index > this.visiblePoolEnd || index < this.visiblePoolStart) {
        const itemBelow = this.visiblePoolEnd < index
        let displace = 0
        if (itemBelow) {
          // Visible pool shifted down
          // +1, because slice doesn't include last item
          displace = index + 1 - this.visiblePoolEnd
        } else {
          // Visible pool shifted up
          displace = (this.visiblePoolStart - index) * -1
        }

        this.visiblePoolStart += displace
        this.visiblePoolEnd += displace
      }

      // Determine node position & scroll into view
      this.$nextTick(() => {
        const pos = Math.max(0, index - this.visiblePoolStart)
        const node = this.$refs.chatWrapper.children[pos]
        node.scrollIntoView(false)
      })
    },

    getPoolSizes () {
      const ref = this.$refs.chatWrapper
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
            this.$refs.chatWrapper.scrollTop = this.$refs.chatWrapper.scrollHeight
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
            requestAnimationFrame(() => {
              target.scrollTop = target.children[target.children.length - vps - 1].offsetTop - offset
              requestAnimationFrame(() => {})
            })
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
            requestAnimationFrame(() => {
            })
          }
          this.blockScrollUp = false
        })
      }
    },
  },
}

</script>

<style scoped lang="scss">
.wrapper {
  position: relative;
  overflow: hidden;

  .chat {
    height: 100%;
    overflow-y: scroll;
  }

  .scrollbar {
    transition: transform .3s;
    transform: translateX(100%);

    &.visible {
      transform: translateX(0);
    }
  }

  &:hover .scrollbar {
    transform: translateX(0);
  }

  ::-webkit-scrollbar {
    display: none;
  }
}

</style>
