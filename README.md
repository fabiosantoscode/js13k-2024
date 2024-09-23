# Fábio's js13k 2024 entry

## Hacking

Install node v22. Other versions might work too.

 - `npm run start` - run a server to host index.html and all the game files, uncompressed
 - `npm run start-compressed` - run a server to try the game as if it was output by `npm run build` ("live" mode)
 - `npm run build` - build the asset (a zip file) to `/tmp/js13k/.build/`
    - if you don't have a `zip` command in PATH, the build will crash. However, you will find the index.html file in that folder
 - `npm run deploy` - deploy to gh pages

The entry point is index.html, and it sources a few scripts in order.

## Architecture

There are differences between development and "production":
 - development is run through `npm run start`, production is run through `npm run start-compressed` or extracted into a zip file through `npm run build`.
 - the "production" environment defines the globally available `self.env` as the string `"production"`. `if (self.env === 'production') {...}` is dutifully removed by Terser.
 - In dev, we do nothing to the scripts in index.html. In production, we concatenate the script tags together, fed into Terser, and inline them into the HTML with a `<script>` tag.
 - In production, the game's story (`story.html`) replaces the `<!-- story -->` magic comment.

## Organisation of the script files

The first file is `game.js` which defines Files are loaded in order, and create variables in the global scope. To avoid duplicate variable names, `let` is used instead of `var`.

Other files will define functions called `update{thing}()` and `draw{thing}()`. These will be called in order from game.js. Essentially, to create a new `{thing}`, you create a new file, define these two functions (or maybe just one), and call them from `update` and `draw` in `game.js`, in the order that makes the most sense.

The storytelling script is `goal.js`. It manipulates variables such as the color of the road, walls and sky, whether we're turning left, and it summons other racers that appear in front of the player. It works through generators, which can feel wonky to read, but has the nice property of letting us define the whole game tutorial, story, levels, and ending cutscene, from a single function `game_generator` that can be read linearly.

