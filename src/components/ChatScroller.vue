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
const scrolledBottom = ({ scrollTop: st, scrollHeight: sh, clientHeight: ch }, buffer = 0) => st + ch + buffer >= sh
const scrolledTop = ({ scrollTop: st, buffer = 0 }) => st - buffer <= 0

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
        const ref = this.$refs.scrollerWrapper
        const scrlH = ref.clientHeight
        const minH = this.minHeight
        const elCount = Math.ceil((scrlH + 2*this.buffer) / minH)
        console.debug({ref, scrlH, minH, elCount, buffer: this.buffer})
        this.visiblePoolSize = elCount

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

      if (this.scrollUp && this.isFirstViewPool) {
        this.$emit('pool.end.first')
        return
      }
      if (this.scrollDown && this.isLastViewPool) {
        this.$emit('pool.end.last')
        return
      }

      // Check if window should change
      if (scrolledBottom(target)) {
        target.scrollTop = target.scrollTop - 1
        if (!this.initial) {
          this.visiblePoolStart += this.visiblePoolSize
        }
        setTimeout(() => {
          this.visiblePoolEnd += this.visiblePoolSize
          this.initial = false
        }, 0)
      } else if (scrolledTop(target)) {
        const prevOffset = target.scrollTop
        if (!this.initial) {
          this.visiblePoolEnd -= this.visiblePoolSize
        }
        this.visiblePoolStart -= this.visiblePoolSize
        this.initial = false
        setTimeout(() => {
          const prevChild = target.children[(this.visiblePoolEnd - this.visiblePoolStart) / 2]
          prevChild.scrollIntoView()
          target.scrollTop += prevOffset
        }, 0)

      }
    },
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
