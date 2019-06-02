<template>
  <div>
    <button @click="newMsg">New message</button>
    <chat-scroller
      class="wrapper"
      :item-pool="items"
      :min-height="100"
      start-bottom>

      <v-msg
        class="item"
        slot-scope="{ item, index }"
        :index="index"
        :message="item" />

    </chat-scroller>
  </div>
</template>

<script>
import ChatScroller from '../components/ChatScroller'
import Message from '../demoComponents/Message'

export default {
  components: {
    ChatScroller,
    'v-msg': Message,
  },

  data () {
    return {
      items: [],
    }
  },

  mounted () {
    setTimeout(() => {
      this.items = [...(new Array(parseInt(this.$route.params.initial || '0')))].map((_, i) => ({ id: i, message: `msg ${i}` }))
    }, 1000)
  },

  methods: {
    newMsg () {
      this.items.push({ id: this.items.length, message: 'new' })
    },
  },
}
</script>

<style scoped lang="scss">
.wrapper {
  height: 90vh;
  border: 1px solid black;
}
.item {
  min-height: 100px;
}

</style>
