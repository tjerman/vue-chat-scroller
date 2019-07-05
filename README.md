# vue-chat-scroller

## Installation
`yarn add https://github.com/tjerman/vue-chat-scroller`
@todo npm module

The library exposes these components:
 * `ChatScroller`

You can import them with:
 * `import { ChatScroller, ... } from 'vue-chat-scroller'`

Register them as components, either in a global scope or a component scope.

## Usage
### ChatScroller
The component provides a list that will progressively load and display a pool of provided items as the user scrolls through it.

The component will determine a visible pool of items for display based on:
 * component's inner height,
 * buffer size,
 * minimum item size.

The goal of this component is to minimize the amount of DOM nodes and to minimize updates required for each node. This wil increase performance.

#### Props
 * `item-pool: { type: Array, required: true, default: () => [] }`
   * All available items. Can be loaded progressively. Each item should provide a unique id field. @todo allow custom id fields.

 * `min-height: { type: Number, required: true, default: 0 }`
   * Used for initial visible pool size calculation.

 * `buffer: { type: Number, required: false, default: 200 }`
   * Provides a buffer size.

 * `start-bottom: { type: Boolean, required: false, default: false }`
   * If pools start from bottom up.

 * `view-pool-size-mult: { type: Number, required: false, default: 2 }`
   * How much can the visible pool expand during scrolling. During scrolling the visible pool might expand to provide a bigger list over time. This prop controls that multiplier.

#### Item object
Can be any structure, that is able to provide these fields:
  * `id`
    * **required**; used to identify objects in the pool. Can be any type, as long as it is comparable.
  
  * `alertable`
    * Optional field that indicates wether a given item can trigger `item:new:invisible` event. If the field is missing (`undefined`) or set to `true`; the event will be triggered. If it's `false` the event won't be triggered.

#### Events
 * `item:new:invisible: { id, index, item }`
   * Fires when the list receives a new *alertable* item, that is not visible in the current visible pool. For example, if the user is looking through their history, and they receive a new message.

 * `scroll:bottom:last: undefined`
   * Fires when the user scrolls to the bottom of last visible pool. If this event triggers, the `scroll:bottom` event will not be fired.

 * `scroll:bottom: { nextLast, lastViewPool, firstViewPool }`
   * Fires when the user scrolls to the bottom of current visible pool.

 * `scroll:top:first: undefined`
   * Fires when the user scrolls to the top of first visible pool. If this event triggers, the `scroll:top` event will not be fired.

 * `scroll:top: { nextLast, lastViewPool, firstViewPool }`
   * Fires when the user scrolls to the top of current visible pool.

#### Slots
 * `default: { item, index }`
   * Provide a template that will be used as an item in the list.

#### Methods
  * `gotoItem ({ id, index })`
      * When invoked, the method will attempt to scroll to the item identified by the `id` or an `index`. If `index` is provided, the `id` can be omitted. If the `index` is omitted, the `id` must be provided. If the item is not found, the function returns an error string, else it returns `true`.

#### Example
```html
<template>
  <div>
    <chat-scroller
      ref="chatScroller"
      class="wrapper"
      start-bottom
      :item-pool="items"
      :min-height="100"
      :view-pool-size-mult="2"
      @scroll:top:first="fetchItems"
      @item:new:invisible="alertNewItem"
      @scroll:bottom="onScrollBottom"
      @scroll:top="onScrollTop">

      <v-msg
        slot-scope="{ item, index }"
        class="item"
        :index="index"
        :message="item" />

    </chat-scroller>

    <div
      v-if="firstOutOfView"
      class="notify">

      <button @click="gotoLastUnread">
        Go to last unread
      </button>
    </div>
  </div>
</template>

```

### Scrollbar
The component provides a virtual scrollbar that prevents glitches caused by native scrollbar.

It only provides an enhancement to the native scroll behaviour and does not re-implement it.

#### Props
 * `scrollable: { required: true, default: null }`
   * Scrollable container that this component should be bound to.

 * `minHeight: { type: Number, required: false, default: 30 }`
   * Minimum thumb size.

#### Events
 * `'drag:start: {}`
   * Fired when dragging starts.
 * `'drag:end: {}`
   * Fired when dragging ends.

#### Slots
None

#### Methods
None

#### Example
```html
<template>
  <div class="wrapper">
    <div ref="wrapper">

      <item
        v-for="(item, i) in items"
        :key="item.id"
        :item="item"
        :index="visiblePoolStart + i"
        class="item-wrapper" />

    </div>

    <scrollbar
      v-if="loaded"
      :class="{ visible: scrollbarPerminant }"
      :scrollable="$refs.wrapper"
      @drag:start="onDragStart"
      @drag:end="onDragEnd" />

  </div>
</template>

```
