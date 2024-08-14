if (self.env === 'production') {
    firstUserInteraction.then(() => {
        document.body.requestFullscreen?.().catch(identity)
    })
}