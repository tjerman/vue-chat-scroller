<template>
  <div :class="[ getColor ]">
    <h1>{{ message.id }}</h1>
    <p>{{ message.message }}</p>
  </div>
</template>

<script>
export default {
  props: {
    index: {
      type: Number,
    },
    message: {
      type: Object,
      default: () => ({}),
    },
  },

  computed: {
    getColor () {
      return (['red', 'green', 'blue', 'purple', 'pink'])[this.index % 5]
    },
  },
}
</script>

<style scoped lang="scss">
div {
  display: flex;
  flex-direction: column;
}
.red {
  background-color: rgba(255, 50, 100, 0.15);
}
.green {
  background-color: rgba(50, 255, 100, 0.15);
}
.blue {
  background-color: rgba(100, 50, 255, 0.15);
}
.purple {
  background-color: rgba(156, 137, 184, 0.15);
}
.pink {
  background-color: rgba(239, 195, 230, 0.15);
}
</style>
