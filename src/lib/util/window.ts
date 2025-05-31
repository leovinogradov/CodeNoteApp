import { Window } from "@tauri-apps/api/window"
import { Webview } from "@tauri-apps/api/webview"

export async function openInNewWindow(filename: string) {
  // const test: any = await invoke("create_window");
  // Webview.
  console.log('test', filename)
  if (!filename) {
    return;
  }
  const label = filename.split('.')[0]
  const newWindow = new Window(label, {
    // url: '/#/preview',  // hash route or use `/preview` depending on your routing
    width: 800,
    height: 600,
    title: 'CodeNodeApp -' + filename,
    resizable: true,
    fullscreen: false,
    backgroundColor: "#000000"
  });

  newWindow.once('tauri://error', (e) => {
    console.error('Error creating new window:', e);
  });

  newWindow.once('tauri://created', () => {
    console.log('New window created');

    const newWebview = new Webview(newWindow, label, {
      url: 'index.html',
      // url: 'https://github.com/tauri-apps/tauri',
      // create a webview with specific logical position and size
      x: 0,
      y: 0,
      width: 800,
      height: 600,
      devtools: true,
      backgroundColor: "#000000"
    });

    newWebview.once('tauri://error', (e) => {
      console.error('Error creating new webview in window:', e);
    });

    newWebview.once('tauri://created', async () => {
      const unlistenFns: any[] = [];

      // Necessary for resize to work
      const resizeUnlisten = await newWindow.onResized(({ payload: size }) => {
        newWebview.setSize(size)
      });
      unlistenFns.push(resizeUnlisten);

      const unlistenClose = newWindow.onCloseRequested(() => {
        try {
          for (const unlisten of unlistenFns) {
            unlisten(); // Call to remove event listener
          }
        } catch (e) {
          console.error(e)
        }
      })
      unlistenFns.push(unlistenClose);
    });
  });
}