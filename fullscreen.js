if (self.env === 'production') {
    firstUserInteraction
        .then(() => {
            // "sc" is the ID of the div that contains the canvas and our controller
            return sc.requestFullscreen()
        })
        .catch(() => {})
}