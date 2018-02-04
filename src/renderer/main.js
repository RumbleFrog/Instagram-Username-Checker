import Vue from 'vue';
import axios from 'axios';
import Buefy from 'buefy';
import 'buefy/lib/buefy.css';

import fontawesome from '@fortawesome/fontawesome';
import solid from '@fortawesome/fontawesome-free-solid';
import regular from '@fortawesome/fontawesome-free-regular';

import App from './App';
import router from './router';
import store from './store';

fontawesome.library.add(solid.faUpload, regular.faHeart);

Vue.use(Buefy, {
  defaultIconPack: 'fas',
});

if (!process.env.IS_WEB) Vue.use(require('vue-electron'));
Vue.http = Vue.prototype.$http = axios;
Vue.config.productionTip = false;

/* eslint-disable no-new */
new Vue({
  components: { App },
  router,
  store,
  template: '<App/>',
}).$mount('#app');
