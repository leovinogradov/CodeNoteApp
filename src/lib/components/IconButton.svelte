<script>
    const props = $props();
</script>

<button class="icon-button">
  <props.icon {...props} />
</button>

<style lang="scss">
  .icon-button {
    left: 52px;
    width: 32px;
    height: 32px;
    padding: 3px; 
    background: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.18);
    // display: inline-flex;
    // align-items: center;
    // justify-content: center;
    // padding: 8px; /* Adjust padding as needed */
    // border: none;
    // background-color: transparent;
    // cursor: pointer;
    /* Add other styling as desired */
  }

  .icon-button:hover {
    background-color: #f0f0f0; /* Example hover effect */
  }
</style>