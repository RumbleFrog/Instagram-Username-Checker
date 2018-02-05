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
        <div id="checking" v-if="checking">

        </div>
        <div class="columns has-text-left">
            <div class="column is-2 is-offset-5 box" style="overflow-y:scroll">
                <div>Test <i class="fas fa-check" style="color:green"></i></div>
                <div>Test <i class="fas fa-spinner fa-pulse"></i></div>
                <div>Test <i class="fas fa-times" style="color:#E0001B"></i></div>
                <div>Test <i class="fas fa-question"></i></div>
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
          const promises = [];
          this.parsedList.forEach((un) => {
            promises.push(this.checkUsername(un));
          });
          Promise.all(promises).then((values) => {
            console.log(`done ${values}`);
            this.checking = false;
          });
        },
        checkUsername(un) {
          return new Promise((resolve, reject) => {
            this.processing[un] = '<i class="fas fa-spinner fa-pulse"></i>';
            request({
              method: 'HEAD',
              url: `https://www.instagram.com/${un}`,
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36' },
              timeout: 500,
            }).on('response', (response) => {
              console.log(response);
              resolve();
            }).on('error', err => reject(err));
          });
        },
      },
      name: 'index',
    };
</script>