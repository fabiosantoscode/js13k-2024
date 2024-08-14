if (self.env === 'production') {
    firstUserInteraction.then(() => {
        c.requestFullscreen?.().catch(identity)
    })
}