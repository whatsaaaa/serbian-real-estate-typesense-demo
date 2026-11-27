# serbian-real-estate-typesense-demo

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

A one-page Nuxt demo of [Typesense](https://github.com/typesense/typesense)'s natural language search on Serbian real estate listings, with Anthropic's Claude as its LLM.

## What it shows

Type what you are looking for in Serbian, such as `trosoban stan na dorcolu`, and the page lists every home that matches: here, the three-room apartments on Dorćol. Typesense's [natural language search](https://typesense.org/docs/30.2/api/natural-language-search.html) sends the query to Claude, which turns it into Typesense filters, and the page shows those filters as chips above the results.

The queries are the hard part, and the demo is about them:

- **Rooms are counted the Serbian way.** The living room is a room, so a "trosoban stan" (`rooms:=3`) is usually two bedrooms and a living room. A half room counts as one half, so a "dvoiposoban stan" is 2.5, and a "garsonjera", a studio, is 0.5.
- **Places are declined.** People write "na Dorćolu" and "u Zemunu", in the locative case, not "Dorćol" and "Zemun".
- **Diacritics are optional.** "dorcolu" is "Dorćolu", and "djeram" is "Đeram".
- **Serbian has two scripts.** "трособан стан на Дорћолу" is the same query in Cyrillic.

The listings are synthetic: 288 homes in Belgrade and Novi Sad, in Serbian.

## How it works

1. The page posts the query to a Nuxt server route, `server/api/search.post.ts`, so no key reaches the browser.
2. The route searches Typesense with `nl_query=true`. Typesense sends the query to Claude with a system prompt and a description of the collection's schema, and answers with the parameters Claude generated, such as `` property_type:=`stan` && rooms:=3 && neighbourhood:=`Dorćol` ``.
3. The route runs a second search with those parameters, and returns the listings and the parameters to the page.

The second search works around a bug of Typesense 30.x, which runs a natural language search against the query as it was typed rather than the generated parameters, so a Cyrillic query finds nothing ([typesense/typesense#2910](https://github.com/typesense/typesense/issues/2910), fixed for v31).

Claude is reached through Anthropic's [OpenAI-compatible endpoint](https://platform.claude.com/docs/en/api/openai-sdk): Typesense's natural language search speaks the OpenAI chat completions API to any `openai/` model, at the `api_url` it is given. The model is Claude Sonnet 4.6. Typesense checks a model as it registers it with a test call that sets `temperature` to 0, which Claude 4.7 and later models reject through this endpoint, so a later Claude model cannot be registered with this Typesense version.

The natural language search's configuration is in the repository:

| File                         | What it is                                                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `typesense/collection.ts`    | The collection's schema, whose fields and faceted values Typesense describes to Claude                      |
| `typesense/system-prompt.ts` | The system prompt: the room counts, the places and their forms, prices, areas, floors, heating and features |
| `typesense/nl-model.ts`      | The natural language search model: Claude, through Anthropic's OpenAI-compatible endpoint                   |
| `shared/locations.ts`        | The one list of places, each with its canonical name and the forms a query may use for it                   |

`shared/locations.ts` gives each place its canonical name and its locative, and derives the rest: the forms without diacritics and the Cyrillic ones. The system prompt lists them all with the filter for each, so Claude only ever filters on a canonical name.

## Run it locally

You need [Docker](https://docs.docker.com/get-docker/), Node.js (22.18 or later on 22, or 24.12 or later), [pnpm](https://pnpm.io/installation) and an [Anthropic API key](https://platform.claude.com/settings/keys).

1. Copy `.env.example` to `.env`, and fill it in: any long random string as `TYPESENSE_API_KEY`, and your Anthropic API key as `ANTHROPIC_API_KEY`. `.env` stays out of git.
2. Start Typesense, which `docker-compose.yml` pins to 30.2:

   ```sh
   docker compose up -d
   ```

3. Install the dependencies, then create the collection, import the listings and register Claude as the model:

   ```sh
   pnpm install
   pnpm seed
   ```

   Typesense keeps the Anthropic API key with the model, in its Docker volume, and calls Claude with it. The app itself never sees it.

4. Start the app, and open http://localhost:3000:

   ```sh
   pnpm dev
   ```

`docker compose down` stops Typesense, and keeps its data for the next start.

## Example queries

What Claude made of each query, and how many of the 288 listings it found:

| Query                                           | Filters                                                                                        | Listings |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------: |
| `trosoban stan na dorcolu`                      | `` property_type:=`stan` && rooms:=3 && neighbourhood:=`Dorćol` ``                             |        5 |
| `трособан стан на Дорћолу`                      | `` property_type:=`stan` && rooms:=3 && neighbourhood:=`Dorćol` ``                             |        5 |
| `dvoiposoban stan na Vračaru`                   | `` property_type:=`stan` && rooms:=2.5 && district:=`Vračar` ``                                |        2 |
| `гарсоњера на Звездари`                         | `` property_type:=`stan` && rooms:=0.5 && district:=`Zvezdara` ``                              |        2 |
| `kuca u zarkovu`                                | `` property_type:=`kuća` && neighbourhood:=`Žarkovo` ``                                        |        2 |
| `stan na Novom Beogradu do 150.000 evra`        | ``property_type:=`stan` && district:=`Novi Beograd` && price_eur:<=150000``                    |       22 |
| `stan na Karaburmi sa liftom i parkingom`       | ``property_type:=`stan` && neighbourhood:=`Karaburma` && has_lift:=true && has_parking:=true`` |        2 |
| `najmanje trosoban stan na Limanu`              | `` property_type:=`stan` && rooms:>=3 && neighbourhood:=`Liman` ``                             |        3 |
| `troiposoban stan na Crvenom krstu ili Neimaru` | ``property_type:=`stan` && rooms:=3.5 && neighbourhood:=[`Crveni krst`,`Neimar`]``             |        2 |
| `najjeftiniji stan u Mirijevu`                  | `` property_type:=`stan` && neighbourhood:=`Mirijevo` ``, sorted by `price_eur:asc`            |        5 |

A district, such as Vračar, Zvezdara or Novi Beograd, matches every neighbourhood in it: Neimar, Crveni krst and Čubura are on Vračar, and the blocks are in Novi Beograd.

## The test set

`eval/queries.json` holds 28 queries in Serbian, each with the filter it should produce. `pnpm eval` runs them against the live search, one Claude call each, and prints a Markdown table. A query matches when the filters Claude generated find the same listings as the expected filter, in the same order when the query asks for one, so Claude may write a filter its own way, as `rooms:3` for `rooms:=3`.

## Working on it

| Command                  | What it does                                                         |
| ------------------------ | -------------------------------------------------------------------- |
| `pnpm dev`               | Starts the app on a local server                                     |
| `pnpm seed`              | Creates the collection, imports the listings and registers the model |
| `pnpm eval`              | Runs the test queries against the live search                        |
| `pnpm test`              | Runs the unit tests                                                  |
| `pnpm generate:listings` | Writes `data/listings.jsonl` again, the same every time              |
| `pnpm build`             | Builds the app into `.output/`                                       |
| `pnpm lint`              | Checks the code and the stylesheets, fixing what it can              |
| `pnpm type-check`        | Type-checks everything                                               |
| `pnpm format`            | Formats everything                                                   |

## License

[MIT](./LICENSE)
