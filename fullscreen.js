// Only called in self.env === 'production'
let onCanvasClickFullscreen = () => {
  if (document.fullscreenElement) {
    return // nothing to do
  } else if (sc.requestFullscreen) {
    sc.requestFullscreen()
  } else {
    // If there's no fullscreen support (like on iphone safari), remove story and prevent scroll.
    // "sc" is the ID of the div that contains the canvas and our controller
    // remove its siblings
    [...sc.parentNode.children].forEach(c => {
        if (c != sc) c.remove()
    })

    document.body.className += ' noScrl'
    document.body.addEventListener('touchmove', e => e.preventDefault(), {passive: false})
    document.body.addEventListener('touchstart', e => e.preventDefault(), {passive: false})
  }
}
