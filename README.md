# WAL GO

## Development

Install the dependencies

```sh
bun install
```

Start the database

```sh
bun db:up
```

### When starting for the first time

Apply database migrations

```sh
bun db:migrate
```

Seed the database

```sh
bun db:seed
```

### Start the development servers

Run the following commands in separate terminals

Start Zero server

```sh
bun zero:dev
```

Start One server

```sh
bun one:dev
```

## Production

### Zero

Deploy the Zero cache close to the database

Generate `zero-schema.json`

```sh
bun zero:build
```

Start Zero server

```sh
bun zero:start
```

### Web

Build the web application

```sh
bun one:build
```

Start the web server

```sh
bun one:start
```

### Native (iOS/Android)

Pre-build the native application

```bash
yarn one:prebuild
```

Afterwards, follow the instructions printed in the terminal to build and upload your iOS/Android app for distribution.
