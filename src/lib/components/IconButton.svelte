<script>
  const { disabled = false, onclick = null, mini = false, ...props } = $props();
</script>

<button class="icon-button" class.mini={mini} disabled={disabled} onclick={onclick}>
  <props.icon {...props} />
</button>

<style lang="scss">
  .icon-button {
    height: 28px;
    padding: 0 5px;
  }
</style>