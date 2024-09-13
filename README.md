# Fábio's js13k 2024 entry

`npm run start` - run a server to host index.html and all the game files, uncompressed
`npm run start-compressed` - run a server to try the game as if it was output by `npm run build` ("live" mode)
`npm run build` - build the asset (a zip file) to `/tmp/js13k/.build/`
    - if you don't have a `zip` command in PATH, the build will crash. However, you will find the index.html file in that folder
`npm run deploy` - deploy to gh pages
