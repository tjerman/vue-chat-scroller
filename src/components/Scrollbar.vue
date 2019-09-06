<template>
  <div
    class="track"
    ref="track"
    @mousedown.self="goto">

    <div
      class="thumb"
      ref="thumb"
      :style="{ top: `${this.offsetTop}px`, height: `${height}px` }" />

  </div>
</template>

<script>
export default {
  props: {
    scrollable: {
      required: true,
      default: null,
    },
    minHeight: {
      type: Number,
      required: false,
      default: 30,
    },
  },

  data () {
    return {
      offsetTop: 0,
      height: 10,
    }
  },

  mounted () {
    window.addEventListener('resize', this.recalculate)
    this.scrollable.addEventListener('scroll', this.recalculate)
    this.$refs.thumb.addEventListener('mousedown', this.onMouseDown)
    window.addEventListener('mouseup', this.onMouseUp)
  },

  beforeDestroy () {
    window.removeEventListener('resize', this.recalculate)
    this.scrollable.removeEventListener('scroll', this.recalculate)
    this.$refs.thumb.removeEventListener('mousedown', this.onMouseDown)
    window.removeEventListener('mouseup', this.onMouseUp)
  },

  methods: {
    // Calculate ratio between the scrollable element and the track
    // Used to determine relative calculations
    getTrackScrollableRatio () {
      return this.scrollable.scrollHeight / this.$refs.track.clientHeight
    },

    goto ({ offsetY }) {
      this.scrollable.scrollTop = offsetY * this.getTrackScrollableRatio()
    },

    recalculate () {
      this.calcThumb({ target: this.scrollable })
    },

    // Implements scrolling by thumb dragging
    onMouseDown (e) {
      e.stopPropagation()
      window.addEventListener('mousemove', this.onMousemove)
      this.$emit('drag:start', {})
    },
    onMouseUp (e) {
      e.stopPropagation()
      window.removeEventListener('mousemove', this.onMousemove)
      this.$emit('drag:end', {})
    },
    onMousemove ({ movementY }) {
      this.scrollable.scrollTop += movementY * this.getTrackScrollableRatio()
    },

    // Calculate thumb's position & size relative to actual thumb.
    calcThumb ({ target }) {
      // Position
      this.offsetTop = target.scrollTop / target.scrollHeight * this.$refs.track.clientHeight

      // Size
      const height = target.clientHeight / target.scrollHeight * this.$refs.track.clientHeight
      this.height = Math.max(this.minHeight, height)
    },
  },
}
</script>

<style scoped lang="scss">
.track {
  position: absolute;
  top: 0;
  right: 0px;
  bottom: 0;
  width: 10px;
  background-color: #1e1e1e15;
  user-select: none;

  .thumb {
    height: 100px;
    background-color: #a7a7a7c5;
    width: 100%;
    position: absolute;
    user-select: none;
    transition: background-color .3s;

    &:hover {
      background-color: #a7a7a7;
    }
  }
}

</style>
