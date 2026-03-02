import { createApp } from 'vue';
import { VueFire, VueFireAuth } from 'vuefire';
import App from './App.vue';
import { app as firebaseApp } from './firebase';
import router from './router';
import './assets/main.css';
const app = createApp(App);
app.use(VueFire, {
    firebaseApp,
    modules: [VueFireAuth()],
});
app.use(router);
app.mount('#app');
