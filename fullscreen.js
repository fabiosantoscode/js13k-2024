if (self.env === 'production') {
    firstUserInteraction.then(() => {
        c.requestFullscreen?.().then(console.log, console.log)
    })
}