# Open Source Tracker 🚀

> A lightway application to view and predict trends of open-source projects using TimeGPT.

## Running

1. The app needs 3 environment variables to properly run. Set them in the terminal, or create a `.env` file with these 3 values:

```sh
GH_TOKEN='<github token>'
PEPY_KEY='<pip auth key>'
NIXTLA_TOKEN='<nixtla application token>'
```

2. Install dependencies, run the development server:

```
npm i
npm run dev
```

3. To build and run for production:

```
npm run build
npm run prod
```

Notes of build:

- Artifacts are built to `dist/`.
- `server.ts` is not transpiled, it's run with `tsx`

## Known Limitations

- Github allows access to the first `40,000` star events only. Therefore, we cannot accurately predict star trends for packages with considerably more than 40k stars (say, Keras). The application informs the user of this.

## Development notes

- This project was built as a coding challenge for Nixtla. It's focused on simplicity, and achieving its goal with little code.
- It's built with TypeScript, Vite and React. It doesn't use any state libraries— just React's state, and a simple class called `ReactiveValue`, inspired by (but a fraction of the complexity of) Jotai.
- Server: the server is minimal, and acts as a "fake proxy", authenticating and forwarding requests to existing apis. Data processing is done in the client to minimize server compute time.
- Chart.js is used for charts. It draws on `<canvas />`.
