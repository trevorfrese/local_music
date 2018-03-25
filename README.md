# local_music

## How to setup
1. Run `npm install`
2. Take all the info in the `conf.txt` I sent you and put that into a file in the root of the directory called `.env`
2. Run `npm start` 
3. Go to your browser and hit http://localhost:3000/spotify/register
4. At this point this will call all the relevant endpoints in `spotify.js`
5. In Atom install the packages `js-hyperclick` and `linter-eslint` and depedencies.
6. Run `npm install knex -g` if you don't have knex
7. Run `knex migrate:latest` to run all db migrations

So first you'll give access to the spotify app. Once the access is given you'll see a lot of stuff show up in the terminal. It should have the `access_token`, which you can use for any of your requests to Spotify's API.

To understand how to use the Web API check searchArtist or checkProfile. 
