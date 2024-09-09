if (self.env === 'production') {
    firstUserInteraction
        .then(async () => {
            try {
                // "sc" is the ID of the div that contains the canvas and our controller
                // remove its siblings, to see if we can have something more fullscreen-like on iphone
                [...sc.parentNode.children].forEach(c => {
                    if (c != sc) c.remove()
                })
                await sc.requestFullscreen()
            } catch (e) {
                if (self.env !== 'production') {
                    console.error(e)
                }
            }

            try {
                await screen.orientation.lock('landscape')
            } catch (e) {
                if (self.env !== 'production') {
                    console.error(e)
                }
            }
        })
}