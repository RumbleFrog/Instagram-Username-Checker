<template>
    <div class="container has-text-centered">
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
                        <p>Drop your username list here or click to upload</p>
                    </div>
                </section>
            </b-upload>
        </b-field>

        <div class="field" v-for="(file, index) in dropFiles" :key="index">
            <b-tag type="is-primary">
                {{ file.name }}
                <button class="delete is-small" type="button" @click="deleteDropFile(index)"></button>
            </b-tag>
        </div>
    </div>
</template>

<script>
    export default {
      data() {
        return {
          parsing: false,
          checking: false,
          dropFiles: [],
          parsedList: [],
          available: [],
          unavailable: [],
        };
      },
      methods: {
        deleteDropFile(index) {
          this.dropFiles.splice(index, 1);
        },
      },
      name: 'index',
    };
</script>

<style scoped>

</style>