<script lang="ts">
  import { invoke } from "@tauri-apps/api/core"
  import { exists, stat, readDir, create, mkdir, BaseDirectory } from "@tauri-apps/plugin-fs";


  let name = "";
  let greetMsg = ""

  async function greet(){
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    greetMsg = await invoke("greet", { name })
    // meta = await metadata("testfile.txt");
    // 
    // const test = await readDir('notes', { baseDir: BaseDirectory.AppData });
    // console.log(test); // true
    const notesDirExists = await exists('notes', { baseDir: BaseDirectory.AppData });
    console.log('TEST', notesDirExists)
    if (!notesDirExists) {
      const success = await mkdir('notes', { baseDir: BaseDirectory.AppLocalData });
      console.log('TEST2', success)
    }
  }
</script>

<div>
  <form class="row" on:submit|preventDefault={greet}>
    <input id="greet-input" placeholder="Enter a name..." bind:value={name} />
    <button type="submit">Greet</button>
  </form>
  <p>{greetMsg}</p>
</div>