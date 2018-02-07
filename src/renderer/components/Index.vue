<template>
    <div class="container has-text-centered">
        <div id="parsing" v-if="!checking">
            <b-field>
                <b-upload v-model="dropFiles" multiple drag-drop accept="text/plain">
                    <section class="section">
                        <div class="content has-text-centered">
                            <p>
                                <b-icon icon="upload" size="is-large"></b-icon>
                            </p>
                            <p>Drop your username lists here or click to parse</p>
                        </div>
                    </section>
                </b-upload>
            </b-field>

            <div class="field" v-for="(file, index) in dropFiles" :key="index">
                <b-tag type="is-info">
                    {{ file.name }}
                    <button class="delete is-small" type="button" @click="deleteDropFile(index)"></button>
                </b-tag>
            </div>

            <button class="button is-primary" :class="{'is-loading': parsing}" @click="parse()">Parse Files</button>

            <button class="button is-danger" v-if="parsedList.length > 0 && !parsing && !checking" @click="check()">Check {{ parsedList.length }} usernames</button>
        </div>
        <div id="result" v-if="Object.keys(processing).length > 0" style="margin-top:2%">
            <div class="columns has-text-left">
                <div class="column is-2 is-offset-5 box" style="overflow-y:scroll;max-height:200px;">
                    <i class="fas fa-spinner fa-pulse" data-fa-symbol="loading"></i>
                    <i class="fas fa-times" style="color:#E0001B" data-fa-symbol="unavailable"></i>
                    <i class="fas fa-check" style="color:green" data-fa-symbol="available"></i>
                    <i class="fas fa-question" data-fa-symbol="unknown"></i>
                    <div v-for="(value, key) in processing" v-html="renderItem(key, value)"></div>
                </div>
            </div>
            <b-field class="has-text-centered" style="display:inline-block;">
                <p class="control">
                    <b-dropdown>
                        <button class="button is-primary" slot="trigger">
                            <span>Export</span>
                            <b-icon icon="caret-down"></b-icon>
                        </button>
                        <b-dropdown-item @click="exportCheck(available)">
                            Available Usernames
                            <b-tag type="is-success">{{ available.length }}</b-tag>
                        </b-dropdown-item>
                        <b-dropdown-item @click="exportCheck(unavailable)">
                            Unavailable Usernames
                            <b-tag type="is-danger">{{ unavailable.length }}</b-tag>
                        </b-dropdown-item>
                        <b-dropdown-item @click="exportCheck(unknown)">
                            Unknown Usernames
                            <b-tag type="is-dark">{{ unknown.length }}</b-tag>
                        </b-dropdown-item>
                        <b-dropdown-item @click="exportCheck(unprocessed)">
                            Unprocessed Usernames
                            <b-tag type="is-link">{{ unprocessed.length }}</b-tag>
                        </b-dropdown-item>
                    </b-dropdown>
                </p>
            </b-field>
            <b-field v-if="checking">
                <button class="button is-danger" @click="askToStop=true">Stop Checking</button>
            </b-field>
        </div>
    </div>
</template>

<script>
    const os = require('os');
    const fs = require('fs');
    const _ = require('lodash');
    const request = require('request');
    const Cookie = require('request-cookies').Cookie;
    const { dialog } = require('electron').remote; // eslint-disable-line import/no-extraneous-dependencies

    export default {
      data() {
        return {
          parsing: false,
          checking: false,
          dropFiles: [],
          parsedList: [],
          available: [],
          unavailable: [],
          unknown: [],
          unprocessed: [],
          processing: {},
          connections: 0,
          maxConnections: 10,
          askToStop: false,
          jar: request.jar(),
          csrf: null,
        };
      },
      methods: {
        deleteDropFile(index) {
          this.dropFiles.splice(index, 1);
        },
        parse() {
          this.parsedList = [];
          this.parsing = true;
          const promises = [];
          this.dropFiles.forEach((file) => {
            promises.push(this.parseFile(file));
          });
          Promise.all(promises).then((values) => {
            values.forEach((value) => {
              this.parsedList = _.uniqBy([...this.parsedList, ...value]);
            });
            this.parsing = false;
            this.$toast.open({
              message: `Parsed ${this.parsedList.length} unique usernames`,
              type: 'is-success',
            });
          }).catch((err) => {
            this.$toast.open({
              message: `Something went wrong: ${err}`,
              type: 'is-danger',
            });
          });
        },
        parseFile(file) {
          return new Promise((resolve, reject) => {
            fs.readFile(file.path, (err, data) => {
              if (err) reject(err);
              resolve(data.toString().split(/\r?\n/));
            });
          });
        },
        check() {
          this.unprocessed = this.parsedList.slice();
          this.checking = true;
          this.iteration = 0;
          this.connections = 0;
          this.initializeSession().then(() => {
            const loop = setInterval(() => {
              if (this.connections < this.maxConnections) {
                this.checkUsername(this.parsedList[this.iteration]);
                this.iteration += 1;
              }
              if (this.iteration >= this.parsedList.length || this.askToStop) {
                clearInterval(loop);
                this.checking = false;
                this.askToStop = false;
              }
            }, 100);
          }).catch((err) => {
            this.$toast.open({
              message: `Something went wrong: ${err}`,
              type: 'is-danger',
            });
          });
        },
        initializeSession() {
          return new Promise((resolve, reject) => {
            request({
              method: 'GET',
              uri: 'https://www.instagram.com/',
              gzip: true,
              jar: this.jar,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
                'Upgrade-Insecure-Requests': '1',
              },
            }, (err, res) => {
              if (err) reject(err);
              resolve(this.saveCSRF(res.headers));
            });
          });
        },
        checkUsername(un) {
          return new Promise((resolve, reject) => {
            this.connections += 1;
            this.$set(this.processing, un, '<svg class="svg-inline--fa fa-w-20"><use xlink:href="#loading"></use></svg>');
            request({
              method: 'POST',
              uri: 'https://www.instagram.com/accounts/web_create_ajax/attempt/',
              gzip: true,
              jar: this.jar,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
                'accept-language': 'en-US,en;q=0.9',
                'x-csrftoken': this.csrf,
                'x-instagram-ajax': '1',
                'x-requested-with': 'XMLHttpRequest',
                referer: 'https://www.instagram.com/',
              },
              form: {
                email: 'mom@gmail.com',
                password: 'hey',
                username: un,
                first_name: 'John',
              },
            }, (err, res, body) => {
              if (err) {
                if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
                  this.$set(this.processing, un, '<svg class="svg-inline--fa fa-w-20"><use xlink:href="#unknown"></use></svg>');
                  this.unknown.push(un);
                  this.removeFromUnprocessed(un);
                  this.connections -= 1;
                } else {
                  reject(err);
                }
              } else {
                if (body.includes('This username isn\'t available') ||
                    body.includes('Your username cannot contain only numbers') ||
                    body.includes('Usernames can only use letters')) {
                  this.$set(this.processing, un, '<svg class="svg-inline--fa fa-w-20"><use xlink:href="#unavailable"></use></svg>');
                  this.unavailable.push(un);
                  this.removeFromUnprocessed(un);
                  this.connections -= 1;
                } else {
                  this.$set(this.processing, un, '<svg class="svg-inline--fa fa-w-20"><use xlink:href="#available"></use></svg>');
                  this.available.push(un);
                  this.removeFromUnprocessed(un);
                  this.connections -= 1;
                }
                this.saveCSRF(res.headers);
              }
            });
          });
        },
        removeFromUnprocessed(un) {
          this.unprocessed.splice(this.unprocessed.indexOf(un), 1);
        },
        saveCSRF(headers) {
          const raw = headers['set-cookie'];
          raw.forEach((eh) => {
            const cookie = new Cookie(eh);
            if (cookie.key === 'csrftoken') {
              this.csrf = cookie.value;
            }
          });
        },
        renderItem(un, ico) {
          return `${un} ${ico}`;
        },
        askSaveLocation() {
          return new Promise((resolve, reject) => {
            dialog.showSaveDialog({
              filters: [{ name: 'Text File', extensions: ['txt'] }],
            }, (filename) => {
              if (filename == null) reject();
              resolve(filename);
            });
          });
        },
        exportCheck(data) {
          this.askSaveLocation().then((loc) => {
            fs.writeFile(loc, data.join(os.EOL), (err) => {
              if (err) {
                this.$toast.open({
                  message: `Something went wrong while saving: ${err}`,
                  type: 'is-danger',
                });
              }
            });
          }).catch((e) => { // eslint-disable-line no-unused-vars
            // Cancelled
          });
        },
      },
      name: 'index',
    };
</script>