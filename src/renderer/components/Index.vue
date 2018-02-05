<template>
    <div class="container has-text-centered">
        <div id="parsing" v-if="checking == false">
            <b-field>
                <b-upload v-model="dropFiles" multiple drag-drop accept="text/plain">
                    <section class="section">
                        <div class="content has-text-centered">
                            <p>
                                <b-icon
                                        icon="upload"
                                        size="is-large">
                                </b-icon>
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
                <div class="column is-2 is-offset-5 box" style="overflow-y:scroll">
                    <div v-for="(value, key) in processing" v-html="renderItem(key, value)"></div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    const fs = require('fs');
    const _ = require('lodash');
    const request = require('request');

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
          this.iteration = 1;
          const promises = [];
          this.parsedList.forEach((un) => {
            // promises.push(this.checkUsername(un));
            setTimeout(() => {
              promises.push(this.checkUsername(un));
            }, this.iteration * 100);
          });
          Promise.all(promises).then(() => {
            this.checking = false;
          });
        },
        checkUsername(un) {
          return new Promise((resolve, reject) => {
            this.$set(this.processing, un, '<i class="fas fa-spinner fa-pulse"></i>');
            request({
              method: 'GET',
              url: `https://www.instagram.com/${un}/`,
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36' },
              timeout: 500,
            }).on('response', (response) => {
              if (response.statusCode === 200) {
                this.$set(this.processing, un, '<i class="fas fa-times" style="color:#E0001B"></i>');
                this.unavailable.push(un);
              } else if (response.statusCode === 404) {
                this.$set(this.processing, un, '<i class="fas fa-check" style="color:green"></i>');
                this.available.push(un);
              }
              resolve();
            }).on('error', (err) => {
              if (err.code === 'ETIMEDOUT') {
                this.$set(this.processing, un, '<i class="fas fa-question"></i>');
                this.unknown.push(un);
              } else {
                reject(err);
              }
            });
          });
        },
        renderItem(un, ico) {
          return `${un} ${ico}`;
        },
      },
      name: 'index',
    };
</script>