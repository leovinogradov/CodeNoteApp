<script>
  const props = $props();
</script>

<button class="icon-button" disabled={props.disabled} onclick={props.onclick}>
  <props.icon {...props} />
</button>

<style lang="scss">
  .icon-button {
    height: 28px;
    padding: 0 5px;
  }
</style>