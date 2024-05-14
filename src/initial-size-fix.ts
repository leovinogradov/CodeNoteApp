export function runInitialSizeFix() {
    /* Detect stupid Windows bug where window is not recognized as the correct size until a resize */
    try {
        // @ts-ignore
        const isEdgeChromium = !!window.chrome && (navigator.userAgent.indexOf("Edg") != -1);
        console.log('TEST', isEdgeChromium, window.outerWidth, window.devicePixelRatio)
        if (isEdgeChromium && window.outerWidth >= 1001 && isCloseTo(window.outerWidth / window.devicePixelRatio, 1000)) {
            console.warn('Detected initial size bug! Adding fix')
            const app = document.getElementById('app')
            // @ts-ignore
            app.classList.add('initial-size-fix')
            window.addEventListener('resize', resizeListenerFunc)
        }
    } catch(err) {
        console.error(err)
    }
}

function resizeListenerFunc() {
    console.log('Removing initial size fix')
    const app = document.getElementById('app')
    // @ts-ignore
    app.classList.remove('initial-size-fix')
    window.removeEventListener('resize', resizeListenerFunc, false)
}

function isCloseTo(a, b) {
    return Math.abs(a - b) <= 1; 
}