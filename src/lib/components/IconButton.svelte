<script>
  const { onclick = null, mini = false, iconProps = {}, ...props } = $props();
</script>
<button class={["icon-button", { 'mini': mini }, props['class']]} onclick={onclick} disabled={props.disabled} hidden={props.hidden}>
  <props.icon {...iconProps} />
</button>

<style lang="scss">
  .icon-button {
    height: 28px;
    padding: 0 5px;
  }
  .icon-button.mini {
    height: 18px;
    padding: 0 2px;
    vertical-align: middle;
    &, &:hover, &:active {
      background: none;
    }
  }
</style>