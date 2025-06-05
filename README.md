# Mec One

This project contains an Express API and a React client built with Vite. The
server uses a PostgreSQL database accessed via [drizzle-orm](https://github.com/drizzle-team/drizzle-orm).

## Prerequisites

- **Node.js 20+** – ensure `node` is available in your `$PATH`.
- **PostgreSQL** – a running database instance reachable through a connection string.
- **Environment variables**:
  - `DATABASE_URL` – PostgreSQL connection string used by both the API and Drizzle migrations.
  - `JWT_SECRET` – secret key used to sign access tokens.
  - `JWT_REFRESH_SECRET` – secret key used to sign refresh tokens.

## Setup

Install dependencies using npm:

```bash
npm install
```

### Running the development server

Start the API and Vite dev server:

```bash
npm run dev
```

### Building for production

Generate optimized client files and the server bundle:

```bash
npm run build
```

The built files are placed in `dist/`. Use `npm start` to serve the production
build:

```bash
npm start
```

### Database migrations

This project uses [Drizzle](https://orm.drizzle.team) for migrations. Run
pending migrations with:

```bash
npm run db:push
```

Ensure `DATABASE_URL` points at your target database before running this
command.
