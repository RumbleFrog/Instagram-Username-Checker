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
                            <p>Drop your username lists here or click to upload</p>
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
                            <b-tag type="is-success">{{ this.available.length }}</b-tag>
                        </b-dropdown-item>
                        <b-dropdown-item @click="exportCheck(unavailable)">
                            Unavailable Usernames
                            <b-tag type="is-danger">{{ this.unavailable.length }}</b-tag>
                        </b-dropdown-item>
                        <b-dropdown-item @click="exportCheck(unknown)">
                            Unknown Usernames
                            <b-tag type="is-dark">{{ this.unknown.length }}</b-tag>
                        </b-dropdown-item>
                        <b-dropdown-item @click="exportCheck(getUnprocessed())">
                            Unprocessed Usernames
                            <b-tag type="is-white">{{ unprocessed.length }}</b-tag>
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
    const https = require('https');
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
          processing: {},
          connections: 0,
          maxConnections: 10,
          askToStop: false,
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
          this.checking = true;
          this.iteration = 0;
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
        },
        checkUsername(un) {
          return new Promise((resolve, reject) => {
            this.connections += 1;
            this.$set(this.processing, un, '<svg class="svg-inline--fa fa-w-20"><use xlink:href="#loading"></use></svg>');
            const pool = new https.Agent({ keepAlive: true });
            const baseRequest = request.defaults({
              method: 'GET',
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36' },
              agent: pool,
              pool: { maxSockets: 10 },
              timeout: 500,
            });
            baseRequest({
              url: `https://www.instagram.com/${un}/`,
            }).on('response', (response) => {
              if (response.statusCode === 200) {
                this.$set(this.processing, un, '<svg class="svg-inline--fa fa-w-20"><use xlink:href="#unavailable"></use></svg>');
                this.unavailable.push(un);
                this.connections -= 1;
              } else if (response.statusCode === 404) {
                this.$set(this.processing, un, '<svg class="svg-inline--fa fa-w-20"><use xlink:href="#available"></use></svg>');
                this.available.push(un);
                this.connections -= 1;
              }
              resolve();
            }).on('error', (err) => {
              if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
                this.$set(this.processing, un, '<svg class="svg-inline--fa fa-w-20"><use xlink:href="#unknown"></use></svg>');
                this.unknown.push(un);
                this.connections -= 1;
              } else {
                reject(err);
              }
            });
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
          }).catch();
        },
      },
      computed: {
        unprocessed: () => _.pullAll(this.parsedList, [...this.available, ...this.unavailable, ...this.unknown]), // eslint-disable-line max-len
      },
      watch: {
        dropFiles: () => {
          if (this.parsing) {
            this.parsing = false;
          }
        },
      },
      name: 'index',
    };
</script>