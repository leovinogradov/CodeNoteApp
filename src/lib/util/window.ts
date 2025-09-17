import { Window } from "@tauri-apps/api/window"
import { Webview } from "@tauri-apps/api/webview"

export async function openStandaloneWindow(filename: string, eventCallback = null) {
  if (!filename) { return; }

  // Make window label based on filename
  const label = filename.split('.')[0]

  // Check if a window with this label already exists
  const existingWindow = await Window.getByLabel(label);
  if (existingWindow) {
    // Focus the existing window and return
    await existingWindow.setFocus();
    return;
  }

  const newWindow = new Window(label, {
    // url: '/#/preview',  // hash route or use `/preview` depending on your routing
    width: 800,
    height: 600,
    title: 'CodeNodeApp | ' + filename,
    resizable: true,
    fullscreen: false,
    backgroundColor: "#000000",
  });

  newWindow.once('tauri://error', (e) => {
    console.error('Error creating new window:', e);
  });

  newWindow.once('tauri://created', () => {
    console.log('New window created');

    const newWebview = new Webview(newWindow, label, {
      url: `index.html?filename=${encodeURIComponent(filename)}`,
      // url: 'https://github.com/tauri-apps/tauri',
      // create a webview with specific logical position and size
      x: 0,
      y: 0,
      width: 800,
      height: 600,
      devtools: true,
      backgroundColor: "#000000",
    });

    newWebview.once('tauri://error', (e) => {
      console.error('Error creating new webview in window:', e);
    });

    newWebview.once('tauri://created', async () => {
      // Webview was created successfully in the new window.
      // New we can set up listeners for the new window.
      const unlistenFns: any[] = [];

      // Resize event - necessary for resize to work
      const resizeUnlisten = await newWindow.onResized(({ payload: size }) => {
        newWebview.setSize(size)
      });
      unlistenFns.push(resizeUnlisten);
      
      // Custom event listener, if callback is provided
      // This allows the main window to listen for events from the new window.
      if (eventCallback) {
        const eventUnlisten = await newWindow.listen("event", eventCallback);
        unlistenFns.push(eventUnlisten);
      }

      newWindow.onCloseRequested(() => {
        for (const unlisten of unlistenFns) {
          try {
            unlisten(); // Call to remove event listener
          } catch (e) {
            console.error(e)
          }
        }
      }).then(unlistenClose => {
        unlistenFns.push(unlistenClose);
      })
    });
  });
}