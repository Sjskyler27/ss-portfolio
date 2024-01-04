// create the app
import { createApp } from 'vue';
import App from './App.vue';
const app = createApp(App);

import BaseButton from './components/BaseButton';
app.component('BaseButton', BaseButton);
import ProjectComponent from './components/ProjectComponent';
app.component('ProjectComponent', ProjectComponent);

app.mount('#app');
