import Vue from 'vue'
import Router from 'vue-router'
import Demo from './views/Demo'

Vue.use(Router)

export default new Router({
  mode: 'history',
  base: '/',
  routes: [
    {
      path: '/:initial?',
      name: 'demo',
      component: Demo,
    },
  ],
})
