export function runInitialsizeFix() {
    /* Detect stupid Windows bug where window is not recognized as the correct size until a resize */
    try {
        const isEdgeChromium = !!window.chrome && (navigator.userAgent.indexOf("Edg") != -1);
        if (isEdgeChromium && window.outerWidth >= 1001 && isCloseTo(window.outerWidth / window.devicePixelRatio, 1000)) {
            console.warn('Detected initial size bug! Adding fix')
            const app = document.getElementById('app')
            app.classList.add('initialsize-fix')
            window.addEventListener('resize', resizeListenerFunc)
        }
    } catch(err) {
        console.error(err)
    }
}

function resizeListenerFunc() {
    console.log('Removing initialsize fix')
    const app = document.getElementById('app')
    app.classList.remove('initialsize-fix')
    window.removeEventListener('resize', resizeListenerFunc, false)
}

function isCloseTo(a, b) {
    return Math.abs(a - b) <= 1; 
}