<template>
  <section class="hero is-fullheight">
      <div class="hero-head">
        <div class="container">
            <nav class="navbar is-transparent" role="navigation" aria-label="Main navigation">
                <div class="navbar-brand">
                    <router-link :to="{ name: 'Index', params: {} }" class="navbar-item"><img src="~@/assets/logo.png" /></router-link>
                </div>
            </nav>
        </div>
      </div>
      <div class="hero-body">
          <router-view></router-view>
      </div>
      <div class="hero-foot">
          <footer class="footer">
              <div class="container">
                  <div class="content has-text-centered">
                      Made with <i class="fas fa-heart" style="color:#DA2444"></i> by <a @click="open('https://hackforums.net/member.php?action=profile&uid=2636502')">RumbleFrog</a>
                  </div>
              </div>
          </footer>
      </div>
  </section>
</template>

<script>
  export default {
    methods: {
      open(link) {
        this.$electron.shell.openExternal(link);
      },
    },
    name: 'instagram-checker',
  };
</script>
